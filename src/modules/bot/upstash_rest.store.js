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
    
    try {
      const res = await fetch(`${this.url}/get/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const data = await res.json();
      const result = data.result ? JSON.parse(data.result) : undefined;
      if (result) this.cache.set(key, result);
      return result;
    } catch (e) {
      logger.warn(`Upstash REST Read Error: ${e.message}`);
      return undefined;
    }
  }

  async write(key, value) {
    // Update cache immediately to prevent race conditions
    this.cache.set(key, value);
    
    try {
      await fetch(`${this.url}/set/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(value)
      });
    } catch (e) {
      logger.warn(`Upstash REST Write Error: ${e.message}`);
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
