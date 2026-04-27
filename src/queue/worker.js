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
      
      logger.info(`Starting job ${job.id} for platform: ${platform}`);

      try {
        // 1. Update status to processing
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: { status: 'processing' },
        });

        // 2. Get social account for credentials
        const socialAccount = await prisma.socialAccount.findFirst({
          where: { userId, platform },
        });

        if (!socialAccount) {
          throw new Error(`No social account linked for ${platform}`);
        }

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

        logger.info(`Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        logger.error(`Job ${job.id} failed:`, error);
        
        // Update DB with error
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            attempts: job.attemptsMade + 1,
          },
        });

        throw error; // Let BullMQ handle retries
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed ultimately:`, err);
  });

  return worker;
};
