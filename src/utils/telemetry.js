import { logger } from './logger.js';

/**
 * Senior SDE Telemetry Utility
 * Centralizes system performance metrics and request tracing.
 */
class Telemetry {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      totalLatency: 0,
    };
  }

  /**
   * Start a high-resolution timer
   * @returns {Array} [seconds, nanoseconds]
   */
  startTimer() {
    return process.hrtime();
  }

  /**
   * End the timer and calculate duration in ms
   * @param {Array} start [seconds, nanoseconds]
   * @returns {number} duration in milliseconds
   */
  endTimer(start) {
    const diff = process.hrtime(start);
    return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
  }

  /**
   * Log a tracing event
   * @param {string} category - e.g., 'REDIS', 'PRISMA', 'WORKER'
   * @param {string} event - e.g., 'CACHE_HIT', 'QUERY_EXEC'
   * @param {number} duration - time in ms
   * @param {Object} metadata - additional info
   */
  trace(category, event, duration, metadata = {}) {
    const metaString = Object.keys(metadata).length ? ` | ${JSON.stringify(metadata)}` : '';
    logger.info(`[TRACE] [${category}] [${event}] ${duration}ms${metaString}`);
    
    if (event === 'CACHE_HIT') this.metrics.cacheHits++;
    if (event === 'CACHE_MISS') this.metrics.cacheMisses++;
    if (category === 'PRISMA') this.metrics.dbQueries++;
  }

  getSummary() {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalCacheRequests > 0 
      ? ((this.metrics.cacheHits / totalCacheRequests) * 100).toFixed(2) 
      : 0;
    
    return {
      ...this.metrics,
      cacheHitRate: `${hitRate}%`,
    };
  }
}

export const telemetry = new Telemetry();
