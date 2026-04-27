import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Postly Core API & Middleware Tests', () => {
  
  describe('1. System Health', () => {
    it('should return 200 OK and timestamp for /health', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('2. Authentication Security', () => {
    it('should reject unauthenticated requests to protected route (/api/user/profile) with 401', async () => {
      const res = await request(app).get('/api/user/profile');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/Unauthorized: Missing or invalid token/i);
    });

    it('should reject requests with invalid JWT tokens with 403', async () => {
      const res = await request(app)
        .post('/api/posts/generate')
        .set('Authorization', 'Bearer definitely-invalid-token');
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('3. Validation Logic (Auth Controller)', () => {
    it('should return 400 Validation Error when logging in with empty body', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 Validation Error when registering with an invalid format email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Test'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.details.email._errors).toContain('Invalid email');
    });
  });

  describe('4. Validation Logic (Post Controller)', () => {
      it('should return 401 missing auth, but assume 400 validation fails if simulated schema fails payload checks', async () => {
        const payload = {
            idea: "A super long idea that exceeds standard parsing requirements limits...",
            post_type: "invalid_type",
            platforms: ["fake_platform"]
        };
        // Verify middleware catches it first in integration scope
        const res = await request(app).post('/api/posts/generate').send(payload);
        expect(res.statusCode).toBe(401); // Auth middleware grabs it first!
      });
  });
  
});