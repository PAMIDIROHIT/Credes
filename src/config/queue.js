import { Queue } from 'bullmq';
import redis from './redis.js';

const defaultJobOptions = {
  removeOnComplete: true,
  removeOnFail: false,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s -> 5s -> 25s handled by BullMQ logic
  },
};

export const publishQueue = new Queue('post-publisher', {
  connection: redis,
  defaultJobOptions,
});
