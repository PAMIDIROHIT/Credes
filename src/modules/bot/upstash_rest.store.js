// Native fetch is used (Node 18+)
import { logger } from '../../utils/logger.js';

export class UpstashRestStore {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.cache = new Map(); // In-memory cache for ultra-low latency and consistency
  }

  async read(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      const res = await fetch(`${this.url}/get/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: controller.signal
      });
      const data = await res.json();
      const result = data.result ? JSON.parse(data.result) : undefined;
      if (result) this.cache.set(key, result);
      return result;
    } catch (e) {
      logger.warn(`Upstash REST Read Error (${key}): ${e.message}`);
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  async write(key, value) {
    this.cache.set(key, value);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      await fetch(`${this.url}/set/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(value),
        signal: controller.signal
      });
    } catch (e) {
      logger.warn(`Upstash REST Write Error (${key}): ${e.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async delete(key) {
    this.cache.delete(key);
    try {
      await fetch(`${this.url}/del/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
    } catch (e) {
      logger.warn(`Upstash REST Delete Error: ${e.message}`);
    }
  }
}
