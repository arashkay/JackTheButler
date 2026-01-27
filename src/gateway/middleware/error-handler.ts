/**
 * Error Handler Middleware
 *
 * Catches all errors and returns standardized JSON responses.
 */

import type { ErrorHandler } from 'hono';
import { AppError } from '@/errors/index.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('error-handler');

export const errorHandler: ErrorHandler = (err, c) => {
  // Handle known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      log.error({ err, path: c.req.path }, err.message);
    } else {
      log.warn({ code: err.code, path: c.req.path }, err.message);
    }

    return c.json(
      {
        error: err.toJSON(),
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500
    );
  }

  // Handle unknown errors - don't leak details
  log.error({ err, path: c.req.path }, 'Unhandled error');

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  );
};
