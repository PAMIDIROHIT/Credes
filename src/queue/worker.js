import { Worker } from 'bullmq';
console.log('>>> [DEBUG] BullMQ Worker imported');
import { telemetry } from '../utils/telemetry.js';
import redis from '../config/redis.js';
import prisma from '../config/db.js';
import { logger } from '../utils/logger.js';
import { decrypt } from '../utils/crypto.util.js';
import { getPublisher } from '../publishers/index.js';
console.log('>>> [DEBUG] Worker dependencies imported');

export const setupWorker = () => {
  const worker = new Worker(
    'post-publisher',
    async (job) => {
      const { platformPostId, userId, platform, content } = job.data;
      const start = telemetry.startTimer();
      const workerId = process.pid;
      
      logger.info(`[THREAD:${workerId}] 🚀 Processing Job ${job.id} | Attempt ${job.attemptsMade + 1}`);

      try {
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: { status: 'processing' },
        });

        const socialAccount = await prisma.socialAccount.findFirst({
          where: { userId, platform },
        });

        if (!socialAccount) throw new Error(`No social account linked for ${platform}`);
        const accessToken = decrypt(socialAccount.accessTokenEnc);
        
        const publisher = getPublisher(platform);
        if (!publisher) throw new Error(`Publisher not found for ${platform}`);

        const result = await publisher(content, accessToken);

        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: {
            status: 'published',
            publishedAt: new Date(),
          },
        });

        const duration = telemetry.endTimer(start);
        telemetry.trace('WORKER', 'JOB_SUCCESS', duration, { id: job.id, platform, attempt: job.attemptsMade + 1 });
        return result;
      } catch (error) {
        const duration = telemetry.endTimer(start);
        const retryIn = job.attemptsMade === 0 ? '2s' : (job.attemptsMade === 1 ? '5s' : 'failed ultimate');
        
        telemetry.trace('WORKER', 'JOB_FAILED', duration, { 
          id: job.id, 
          err: error.message, 
          retryIn,
          attempt: job.attemptsMade + 1 
        });
        
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

  worker.on('error', (err) => {
    if (!err.message.includes('WRONGPASS')) {
      logger.error('Worker System Error:', err.message);
    }
  });

  return worker;
};
