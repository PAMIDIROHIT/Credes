import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Authentication & User Flow', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    name: 'Test User',
  };

  let accessToken;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.email).toEqual(testUser.email);
  });

  it('should login and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('accessToken');
    accessToken = res.body.data.accessToken;
  });

  it('should fetch the current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.email).toEqual(testUser.email);
  });

  it('should update user profile', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name', bio: 'New Bio' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.name).toEqual('Updated Name');
  });

  it('should fail to access protected route with invalid token', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer invalid_token');

    expect(res.statusCode).toEqual(401);
  });
});
