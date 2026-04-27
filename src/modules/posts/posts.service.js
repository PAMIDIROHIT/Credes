import prisma from '../../config/db.js';
import { publishQueue } from '../../config/queue.js';
import { logger } from '../../utils/logger.js';

export const createPostAndQueue = async (userId, data) => {
  const { idea, post_type, tone, language, model_used, generated_content, publish_at } = data;

  // 1. Create the main Post record
  logger.info(`Creating post for user ${userId}...`);
  const post = await prisma.post.create({
    data: {
      userId,
      idea,
      postType: post_type,
      tone,
      language,
      modelUsed: model_used,
      publishAt: publish_at ? new Date(publish_at) : null,
      status: publish_at ? 'scheduled' : 'queued',
    },
  });

  // 2. Create PlatformPost records
  logger.info(`Creating platform posts for post ${post.id}...`);
  const platformPosts = await Promise.all(
    Object.entries(generated_content).map(([platform, payload]) => {
      let normalizedPlatform = platform.toLowerCase();
      if (normalizedPlatform.includes('twitter') || normalizedPlatform === 'x') {
        normalizedPlatform = 'twitter';
      }
      return prisma.platformPost.create({
        data: {
          postId: post.id,
          platform: normalizedPlatform,
          content: payload.content,
          status: publish_at ? 'scheduled' : 'queued',
        },
      });
    })
  );

  // 3. Queue jobs
  logger.info(`Queueing ${platformPosts.length} jobs to BullMQ...`);
  const now = Date.now();
  const delay = publish_at ? Math.max(0, new Date(publish_at).getTime() - now) : 0;

  try {
    await Promise.all(
      platformPosts.map((pp) =>
        publishQueue.add(
          `${pp.platform}-publish`,
          {
            platformPostId: pp.id,
            userId,
            platform: pp.platform,
            content: pp.content,
          },
          { 
            jobId: pp.id,
            delay: delay
          }
        )
      )
    );
    logger.info(`✅ Successfully queued jobs for post ${post.id}`);
  } catch (err) {
    logger.error(`❌ Failed to queue jobs: ${err.message}`);
    throw err;
  }

  return post;
};

export const getPostById = async (userId, postId) => {
  const post = await prisma.post.findFirst({
    where: { id: postId, userId },
    include: { platformPosts: true },
  });

  if (!post) throw new Error('Post not found');
  return post;
};

export const getPosts = async (userId, query) => {
  const { page = 1, limit = 10, status, platform, startDate, endDate } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = { userId };
  if (status) where.status = status;
  if (platform) {
    where.platformPosts = { some: { platform } };
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { platformPosts: true },
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts,
    meta: { total, page: Number(page), limit: Number(limit) },
  };
};

export const retryFailedPost = async (userId, platformPostId) => {
  const pp = await prisma.platformPost.findFirst({
    where: { id: platformPostId, post: { userId } },
    include: { post: true },
  });

  if (!pp) throw new Error('Post not found');

  await prisma.platformPost.update({
    where: { id: pp.id },
    data: { status: 'queued', errorMessage: null },
  });

  await publishQueue.add(`${pp.platform}-retry`, {
    platformPostId: pp.id,
    userId,
    platform: pp.platform,
    content: pp.content,
  });

  return { success: true };
};
