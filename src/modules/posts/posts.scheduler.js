import prisma from '../../config/db.js';
import { publishQueue } from '../../config/queue.js';
import { logger } from '../../utils/logger.js';

/**
 * ScheduledPostProcessor
 * Checks for posts that are due for publication and puts them into the BullMQ active queue.
 * Run this in server.js or as a separate cron job.
 */
export const processScheduledPosts = async () => {
  try {
    const now = new Date();
    
    // 1. Find all scheduled posts that are due
    const duePosts = await prisma.post.findMany({
      where: {
        status: 'scheduled',
        publishAt: { lte: now },
      },
      include: { platformPosts: true },
    });

    if (duePosts.length === 0) return;

    logger.info(`Processing ${duePosts.length} due scheduled posts...`);

    for (const post of duePosts) {
      // 2. Update post status to queued
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'queued' },
      });

      // 3. Queue platform posts
      for (const pp of post.platformPosts) {
        if (pp.status === 'scheduled') {
          await prisma.platformPost.update({
            where: { id: pp.id },
            data: { status: 'queued' },
          });

          await publishQueue.add(
            `${pp.platform}-publish`,
            {
              platformPostId: pp.id,
              userId: post.userId,
              platform: pp.platform,
              content: pp.content,
            },
            { jobId: pp.id }
          );
        }
      }
    }
  } catch (error) {
    logger.error('Scheduled post processor failed:', error);
  }
};

// Polling interval: every 1 minute
export const startPostScheduler = () => {
  logger.info('Post Scheduler started (polling every 60s)');
  setInterval(processScheduledPosts, 60 * 1000);
};
