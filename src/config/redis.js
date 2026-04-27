import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', (err) => logger.error('Redis connection error:', err));

export default redis;
