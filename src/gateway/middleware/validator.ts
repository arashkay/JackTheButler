/**
 * Request Validation Middleware
 *
 * Validates request bodies using Zod schemas.
 */

import type { MiddlewareHandler } from 'hono';
import type { z } from 'zod';
import { ValidationError } from '@/errors/index.js';

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends z.ZodSchema>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: String(e.path.join('.')),
        message: e.message,
      }));
      throw new ValidationError('Validation failed', errors);
    }

    c.set('validatedBody', result.data);
    await next();
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodSchema>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: String(e.path.join('.')),
        message: e.message,
      }));
      throw new ValidationError('Invalid query parameters', errors);
    }

    c.set('validatedQuery', result.data);
    await next();
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T extends z.ZodSchema>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const params = c.req.param();
    const result = schema.safeParse(params);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: String(e.path.join('.')),
        message: e.message,
      }));
      throw new ValidationError('Invalid URL parameters', errors);
    }

    c.set('validatedParams', result.data);
    await next();
  };
}
