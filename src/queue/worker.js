import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import prisma from '../config/db.js';
import { decrypt } from '../utils/crypto.util.js';
import { getPublisher } from '../publishers/index.js';
import { logger } from '../utils/logger.js';

export const setupWorker = () => {
  const worker = new Worker(
    'post-publisher',
    async (job) => {
      const { platformPostId, userId, platform, content } = job.data;
      const startTime = Date.now();
      const workerId = process.pid;
      
      logger.info(`[WORKER:${workerId}] 🟢 Executing Job ${job.id} | Platform: ${platform.toUpperCase()}`);

      try {
        // 1. Update status to processing
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: { status: 'processing' },
        });

        // 2. Get social account
        const socialAccount = await prisma.socialAccount.findFirst({
          where: { userId, platform },
        });

        if (!socialAccount) throw new Error(`No social account linked for ${platform}`);
        const accessToken = decrypt(socialAccount.accessTokenEnc);
        
        // 3. Execute platform-specific publishing
        const publisher = getPublisher(platform);
        if (!publisher) throw new Error(`Publisher not found for ${platform}`);

        const result = await publisher(content, accessToken);

        // 4. Update status to published
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: {
            status: 'published',
            publishedAt: new Date(),
          },
        });

        const duration = Date.now() - startTime;
        logger.info(`[WORKER:${workerId}] ✅ Job ${job.id} SUCCESS (${platform}) | Duration: ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`[WORKER:${workerId}] ❌ Job ${job.id} FAILED (${platform}) | Duration: ${duration}ms | Error: ${error.message}`);
        
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            attempts: job.attemptsMade + 1,
          },
        });

        throw error;
      }
    },
    { connection: redis }
  );

  // Queue Lifecycle Telemetry
  worker.on('active', (job) => {
    logger.info(`📊 Queue Monitor: Job ${job.id} is now ACTIVE`);
  });

  worker.on('completed', (job) => {
    logger.info(`📊 Queue Monitor: Job ${job.id} is COMPLETED`);
  });

  worker.on('error', (err) => {
    if (err.message.includes('WRONGPASS')) {
      // Silence it, we already log it in redis.js
    } else {
      logger.error('Worker Error:', err.message);
    }
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed ultimately:`, err);
  });

  return worker;
};
