import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import prisma from '../../src/config/db.js';
import redis from '../../src/config/redis.js';

/**
 * Professional Integration Suite
 * Covers: Auth, Routing, Roles, and Health
 */

describe('🛡️ Postly Engine: Unified Integration Suite', () => {
  
  test('✅ Health Check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  describe('🔑 Authentication Flow', () => {
    test('Should return 401 for unauthorized posts access', async () => {
      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(401);
    });

    test('Should return 401 for invalid login credentials', async () => {
      // Mock findUnique to return null (user not found)
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@postly.ai', password: 'wrong' });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid');
    });
  });

  describe('📝 Posts & Content', () => {
    test('Should require auth for platform publishing', async () => {
      const res = await request(app)
        .post('/api/posts/publish')
        .send({ idea: 'Test', platforms: ['twitter'] });
      expect(res.status).toBe(401);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
});
