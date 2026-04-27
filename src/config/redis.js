import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redis = null;

// Only even TRY to connect if it's not a localhost default that we know is missing
if (env.REDIS_URL && !env.REDIS_URL.includes('localhost')) {
  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      lazyConnect: false,
      retryStrategy: () => null // Stop retrying immediately
    });
    
    redis.on('error', (err) => {
        if (err.message.includes('WRONGPASS')) {
            logger.error('❌ Redis Auth Failed (WRONGPASS). Check your password in .env.');
            if (redis) {
              redis.disconnect();
              redis = null;
            }
        } else {
            logger.warn(`⚠️ Redis unreachable: ${err.message}`);
        }
    });
  } catch (e) {
    logger.error('❌ Redis Init Error:', e.message);
  }
} else {
    logger.info('ℹ️ Redis set to localhost or disabled. Using In-Memory fallback mode for 10/10 stability.');
}

export default redis;
