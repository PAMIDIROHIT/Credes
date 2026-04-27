import prisma from '../../config/db.js';

export const getStats = async (userId) => {
  const [totalPosts, platformCounts, statusCounts] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.platformPost.groupBy({
      by: ['platform'],
      where: { post: { userId } },
      _count: true,
    }),
    prisma.platformPost.groupBy({
      by: ['status'],
      where: { post: { userId } },
      _count: true,
    }),
  ]);

  return {
    totalPosts,
    platforms: platformCounts.map(p => ({ platform: p.platform, count: p._count })),
    statuses: statusCounts.map(s => ({ status: s.status, count: s._count })),
    successRate: totalPosts > 0 
      ? (statusCounts.find(s => s.status === 'published')?._count || 0) / totalPosts * 100 
      : 0,
  };
};
