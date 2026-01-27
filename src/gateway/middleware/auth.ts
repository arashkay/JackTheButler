/**
 * Authentication Middleware
 *
 * JWT verification for protected routes.
 */

import type { MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';
import { UnauthorizedError, ForbiddenError } from '@/errors/index.js';
import { loadConfig } from '@/config/index.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('auth');

export interface JWTPayload {
  sub: string;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Require valid JWT token
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const config = loadConfig();
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(config.jwt.secret);
    const { payload } = await jwtVerify(token, secret);

    // Reject refresh tokens used as access tokens
    if (payload.type === 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    c.set('user', payload as unknown as JWTPayload);
    c.set('userId', payload.sub);

    await next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    log.debug({ error }, 'Token verification failed');
    throw new UnauthorizedError('Invalid or expired token');
  }
};

/**
 * Optional auth - continues without user if no valid token
 */
export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const config = loadConfig();
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const secret = new TextEncoder().encode(config.jwt.secret);
      const { payload } = await jwtVerify(token, secret);

      if (payload.type !== 'refresh') {
        c.set('user', payload as unknown as JWTPayload);
        c.set('userId', payload.sub);
      }
    } catch {
      // Invalid token - continue without user
    }
  }

  await next();
};

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user') as JWTPayload | undefined;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`);
    }

    await next();
  };
}
