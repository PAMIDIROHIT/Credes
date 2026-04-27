import redis from '../config/redis.js';

export const redisStorage = {
  async read(key) {
    const data = await redis.get(`bot_session:${key}`);
    return data ? JSON.parse(data) : undefined;
  },
  async write(key, value) {
    await redis.set(`bot_session:${key}`, JSON.stringify(value), 'EX', 1800); // 30-minute expiry
  },
  async delete(key) {
    await redis.del(`bot_session:${key}`);
  },
};
