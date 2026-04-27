import { UpstashRestStore } from './upstash_rest.store.js';
import { logger } from '../../utils/logger.js';

const memoryStore = new Map();

// Initialize the Upstash Store if credentials exist
let upstashStore = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  logger.info('🛰️ Using Upstash REST for Bot Session persistence');
  upstashStore = new UpstashRestStore(
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export const redisStorage = {
  async read(key) {
    if (upstashStore) {
      return await upstashStore.read(key);
    }
    return memoryStore.get(key);
  },
  async write(key, value) {
    if (upstashStore) {
      await upstashStore.write(key, value);
    }
    memoryStore.set(key, value);
  },
  async delete(key) {
    if (upstashStore) {
      await upstashStore.delete(key);
    }
    memoryStore.delete(key);
  },
};
