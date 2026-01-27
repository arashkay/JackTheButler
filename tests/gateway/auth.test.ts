/**
 * Authentication Routes Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '@/gateway/server.js';
import { db, staff } from '@/db/index.js';
import { eq } from 'drizzle-orm';

describe('Auth Routes', () => {
  // Ensure test user exists
  beforeAll(async () => {
    const existing = await db.select().from(staff).where(eq(staff.email, 'test@hotel.com')).limit(1);
    if (existing.length === 0) {
      await db.insert(staff).values({
        id: 'staff-test-001',
        email: 'test@hotel.com',
        name: 'Test User',
        role: 'admin',
        department: 'testing',
        permissions: JSON.stringify(['*']),
        status: 'active',
        passwordHash: 'test123',
      });
    }
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@hotel.com',
          password: 'test123',
        }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.accessToken).toBeDefined();
      expect(json.refreshToken).toBeDefined();
      expect(json.expiresIn).toBe(900); // 15 minutes
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@hotel.com',
          password: 'wrongpassword',
        }),
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@hotel.com',
          password: 'password',
        }),
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid body', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
        }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user info with valid token', async () => {
      // First login to get token
      const loginRes = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@hotel.com',
          password: 'test123',
        }),
      });
      const { accessToken } = await loginRes.json();

      // Then get user info
      const res = await app.request('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user.email).toBe('test@hotel.com');
      expect(json.user.role).toBe('admin');
    });

    it('should return 401 without token', async () => {
      const res = await app.request('/api/v1/auth/me');
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const res = await app.request('/api/v1/auth/me', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      // First login to get tokens
      const loginRes = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@hotel.com',
          password: 'test123',
        }),
      });
      const { refreshToken } = await loginRes.json();

      // Then refresh
      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.accessToken).toBeDefined();
      expect(json.refreshToken).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid-token' }),
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });
});
