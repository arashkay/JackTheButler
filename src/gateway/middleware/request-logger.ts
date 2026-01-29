/**
 * Request Logger Middleware
 *
 * Logs incoming requests and response times.
 * Also records metrics for HTTP request latency.
 */

import type { MiddlewareHandler } from 'hono';
import { createLogger } from '@/utils/logger.js';
import { metrics } from '@/monitoring/index.js';

const log = createLogger('http');

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    const { method, path } = c.req;

    // Skip logging for health checks to reduce noise
    const isHealthCheck = path.startsWith('/health');

    if (!isHealthCheck) {
      log.debug({ method, path }, 'Request started');
    }

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Record metrics (skip health checks)
    if (!isHealthCheck) {
      metrics.httpRequestTime.observe(duration);

      if (status >= 500) {
        metrics.errors.inc();
      }

      const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      log[logLevel]({ method, path, status, duration }, 'Request completed');
    }
  };
};
