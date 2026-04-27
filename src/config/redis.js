import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { telemetry } from '../utils/telemetry.js';

let redisInstance = null;

const createRedisProxy = (client) => {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'get') {
        return async (key) => {
          const start = telemetry.startTimer();
          let value = null;
          try {
            value = await target.get(key);
          } catch (e) {
            logger.error(`Redis Get Error: ${e.message}`);
          }
          const duration = telemetry.endTimer(start);
          
          if (value) {
            telemetry.trace('REDIS', 'CACHE_HIT', duration, { key });
          } else {
            telemetry.trace('REDIS', 'CACHE_MISS', duration, { key });
          }
          return value;
        };
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
};

if (env.REDIS_URL && !env.REDIS_URL.includes('localhost')) {
  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });
    
    redisInstance = createRedisProxy(client);
    client.ping().catch(() => {});
    logger.info("📡 Upstash Redis traces active");
  } catch (err) {
    logger.error("❌ Redis Initialization Error:", err.message);
  }
} else {
  logger.info('ℹ️ Redis disabled/localhost. Tracing inactive.');
}

export default redisInstance;
