import prisma from '../../config/db.js';
import { publishQueue } from '../../config/queue.js';
import { logger } from '../../utils/logger.js';

export const createPostAndQueue = async (userId, data) => {
  const { idea, post_type, tone, language, model_used, generated_content, publish_at } = data;

  // 1. Create the main Post record
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

  // 2. Create PlatformPost records for each platform
  const platformPosts = await Promise.all(
    Object.entries(generated_content).map(([platform, payload]) =>
      prisma.platformPost.create({
        data: {
          postId: post.id,
          platform,
          content: payload.content,
          status: publish_at ? 'scheduled' : 'queued',
        },
      })
    )
  );

  // 3. Queue jobs if it's immediate publish
  if (!publish_at) {
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
          { jobId: pp.id }
        )
      )
    );
  }

  return post;
};

export const getPosts = async (userId, query) => {
  const { page = 1, limit = 10, status } = query;
  const skip = (page - 1) * limit;

  const where = { userId };
  if (status) where.status = status;

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
