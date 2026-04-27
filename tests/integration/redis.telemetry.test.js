import { jest } from '@jest/globals';
import redis from '../../src/config/redis.js';

describe('🚀 Database & Tracing: Redis Search Latency and Hit/Miss Telemetry', () => {
  afterAll(async () => {
    if (redis) await redis.quit();
  });


  test('Should track a CACHE_MISS and record searching time', async () => {
    const start = Date.now();
    const result = await redis.get('postly:test:missing_key');
    const end = Date.now();
    
    // Time in milliseconds
    const durationMs = end - start;

    expect(result).toBeNull();
    console.log(`\n[TELEMETRY TRACE] ❌ CACHE_MISS`);
    console.log(`- Action: Searched for 'postly:test:missing_key'`);
    console.log(`- Actual Data Retrieved: null`);
    console.log(`- Time of searching in Redis: ${durationMs.toFixed(3)} ms`);
    
    // The search time must be reasonably fast for Upstash
    expect(durationMs).toBeLessThan(2000);
  });

  test('Should strictly write actual data, track CACHE_HIT, and verify the physical payload', async () => {
    // 1. Prepare actual post data
    const actualData = JSON.stringify({ idea: "Postly AI is blazingly fast", generated_for: "LinkedIn" });
    const key = `postly:test:real_data_${Date.now()}`;

    // Write to Redis with an expiration of 10s so we don't pollute the cloud
    await redis.set(key, actualData, 'EX', 10);

    // 2. Fetch and Trace
    const start = Date.now();
    const result = await redis.get(key);
    const end = Date.now();
    
    const durationMs = end - start;

    expect(result).not.toBeNull();
    expect(result).toEqual(actualData);

    console.log(`\n[TELEMETRY TRACE] ✅ CACHE_HIT`);
    console.log(`- Action: Stored and searched for '${key}'`);
    console.log(`- Actual Datas Stored in Redis: ${result}`);
    console.log(`- Time of searching in Redis: ${durationMs.toFixed(3)} ms`);
    
    // Ensuring caching speed is consistently tracked
    expect(durationMs).toBeLessThan(2000);
  });
});
