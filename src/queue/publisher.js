import { Queue, Worker } from 'bullmq';
import { prisma } from '../utils/prisma.util.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

export const publisherQueue = new Queue('social-publishing', { connection });

const simulatePlatformPublish = async (platform, content, credentials) => {
  // In a real application, make axios calls to Twitter API, LinkedIn API etc...
  console.log(`Publishing to ${platform} with length ${content.length}...`);
  return { success: true, url: `https://${platform}.com/post/${Math.random().toString(36).substring(7)}` };
};

export const initWorker = () => {
    const worker = new Worker('social-publishing', async (job) => {
        const { platformPostId, platform, content, userId } = job.data;

        await prisma.platformPost.update({
            where: { id: platformPostId },
            data: { status: 'processing', attempts: { increment: 1 } }
        });

        try {
            // Get user's social accounts
            const accounts = await prisma.socialAccount.findMany({ where: { user_id: userId, platform } });
            if (accounts.length === 0) throw new Error(\`No connected \${platform} account\`);

            const result = await simulatePlatformPublish(platform, content, accounts[0]);
            
            await prisma.platformPost.update({
                where: { id: platformPostId },
                data: { status: 'published', published_at: new Date() }
            });

            console.log(`Job Complete: ${job.id}`);
            return result;
        } catch (error) {
            await prisma.platformPost.update({
                where: { id: platformPostId },
                data: { status: 'failed', error_message: error.message }
            });
            throw error;
        }
    }, { connection, limiter: { max: 10, duration: 1000 } });

    worker.on('failed', (job, err) => {
        console.error(`Job \${job.id} failed: \${err.message}`);
    });
};