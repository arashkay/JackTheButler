/**
 * Authentication Routes
 *
 * Login, logout, and token refresh endpoints.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { validateBody, requireAuth } from '../middleware/index.js';
import { AuthService } from '@/services/auth.js';

// Define custom variables type for Hono context
type Variables = {
  validatedBody: unknown;
  userId: string;
};

const auth = new Hono<{ Variables: Variables }>();
const authService = new AuthService();

/**
 * Login schema
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Refresh token schema
 */
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /auth/login
 * Authenticate with email and password
 */
auth.post('/login', validateBody(loginSchema), async (c) => {
  const { email, password } = c.get('validatedBody') as z.infer<typeof loginSchema>;

  const tokens = await authService.login(email, password);

  return c.json(tokens);
});

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 */
auth.post('/refresh', validateBody(refreshSchema), async (c) => {
  const { refreshToken } = c.get('validatedBody') as z.infer<typeof refreshSchema>;

  const tokens = await authService.refresh(refreshToken);

  return c.json(tokens);
});

/**
 * GET /auth/me
 * Get current authenticated user info
 */
auth.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId');

  const user = await authService.getUser(userId);

  return c.json({ user });
});

/**
 * POST /auth/logout
 * Invalidate refresh token (future: add to blacklist)
 */
auth.post('/logout', requireAuth, async (c) => {
  // In a production system, we would add the token to a blacklist
  // For now, just return success
  return c.json({ message: 'Logged out successfully' });
});

export { auth as authRoutes };
