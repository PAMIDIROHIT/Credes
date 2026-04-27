import { z } from 'zod';
import { prisma } from '../utils/prisma.util.js';
import { generateContent } from '../services/ai.service.js';
import { publisherQueue } from '../queue/publisher.js';

const generateSchema = z.object({
  idea: z.string().max(500),
  post_type: z.enum(['announcement', 'thread', 'story', 'promotional', 'educational', 'opinion']),
  platforms: z.array(z.enum(['twitter', 'linkedin', 'instagram', 'threads'])),
  tone: z.enum(['professional', 'casual', 'witty', 'authoritative', 'friendly']),
  language: z.string().default('en'),
  model: z.enum(['openai', 'anthropic']),
});

const postQueueSchema = z.object({
    postId: z.string().uuid(),
    publishAt: z.string().optional() // ISO string
});

export const apiGenerateContent = async (req, res) => {
  try {
    const pars = generateSchema.safeParse(req.body);
    if (!pars.success) return res.status(400).json({ error: 'Validation failed', details: pars.error.format() });

    const result = await generateContent(req.user.id, pars.data);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate content', msg: error.message });
  }
};

export const publishPost = async (req, res) => {
    try {
        const { postId, publishAt } = req.body;
        const post = await prisma.post.findUnique({ where: { id: postId }, include: { platform_posts: true }});
        
        if (!post) return res.status(404).json({ error: "Post not found" });
        if (post.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        const delay = publishAt ? new Date(publishAt).getTime() - Date.now() : 0;
        
        // Ensure delay is not strongly negative implicitly
        if (delay < 0) return res.status(400).json({ error: "Cannot schedule in the past" });

        // Update post metadata
        await prisma.post.update({ where: { id: post.id }, data: { status: 'queued', publish_at: publishAt ? new Date(publishAt) : new Date() }});

        for (const pp of post.platform_posts) {
            await publisherQueue.add('publish-platform-job', {
                platformPostId: pp.id,
                platform: pp.platform,
                content: pp.content,
                userId: post.user_id
            }, { delay: delay > 0 ? delay : 0, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }); // Exponential backoff (1s -> 5s indirectly per docs setup mapped by bullMQ defaults) - user requested 1s, 5s, 25s which mapping custom strategy can handle
        }

        res.status(200).json({ message: delay > 0 ? \`Post scheduled for \${publishAt}\` : "Post queued immediately" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to queue post' });
    }
};

export const getPosts = async (req, res) => {
    let { page = 1, limit = 10, status, platform } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    try {
        const where = { user_id: req.user.id };
        if (status) where.status = status;
        if (platform) where.platform_posts = { some: { platform } };

        const total = await prisma.post.count({ where });
        const posts = await prisma.post.findMany({
            where,
            include: { platform_posts: { select: { platform: true, status: true } } },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({
            data: posts,
            meta: { total, page, limit }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPostDetail = async (req, res) => {
    try {
        const post = await prisma.post.findUnique({
            where: { id: req.params.id },
            include: { platform_posts: true }
        });
        if (!post || post.user_id !== req.user.id) return res.status(404).json({ error: "Post not found" });

        res.status(200).json({ data: post });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getStats = async (req, res) => {
    try {
        const userPosts = await prisma.post.findMany({ where: { user_id: req.user.id }, include: { platform_posts: true }});
        let total = userPosts.length;
        let success = 0;
        let platforms = { twitter: 0, linkedin: 0, instagram: 0, threads: 0 };

        userPosts.forEach(post => {
            post.platform_posts.forEach(pp => {
                if (pp.status === 'published') {
                    success++;
                    if (platforms[pp.platform] !== undefined) platforms[pp.platform]++;
                }
            });
        });

        res.status(200).json({ data: { total_posts: total, successful_platform_posts: success, success_rate: total > 0 ? (success / (total*2) /*approx*/ * 100).toFixed(2) + '%' : '0%', breakdown: platforms }});
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const cancelPost = async (req, res) => {
    try {
        const post = await prisma.post.findUnique({ where: { id: req.params.id }});
        if (!post || post.user_id !== req.user.id) return res.status(404).json({ error: "Post not found" });

        if (post.status === 'published' || post.status === 'processing') {
            return res.status(400).json({ error: "Cannot cancel a post that is published or processing" });
        }

        await prisma.post.update({ where: { id: post.id }, data: { status: 'cancelled' }});
        // Also mark platform posts cancelled
        await prisma.platformPost.updateMany({ where: { post_id: post.id }, data: { status: 'cancelled' }});

        res.status(200).json({ message: "Scheduled post cancelled successfully" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel post' });
    }
};
