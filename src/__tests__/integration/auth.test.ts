import request from 'supertest';
import app from '../../app';
import { UserModel } from '../../models/user.model';

describe('Auth API Integration Tests', () => {
    const unique = Date.now();
    const testUser = {
        name: 'Test User',
        email: `test-${unique}@example.com`,
        password: 'password123',
        location: 'Kathmandu',
    };

    beforeAll(async () => {
        await UserModel.deleteOne({ email: testUser.email });
    });

    afterAll(async () => {
        await UserModel.deleteOne({ email: testUser.email });
    });

    describe('POST /api/v1/auth/register', () => {
        test('should validate missing email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    name: testUser.name,
                    password: testUser.password,
                    location: testUser.location,
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate invalid email format', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    ...testUser,
                    email: 'invalid-email',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate short password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    ...testUser,
                    password: '123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should register new user successfully', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(testUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Registration successful');
            expect(res.body.token ?? res.body.data?.token).toBeDefined();
            expect(res.body.data).toBeDefined();
            expect(res.body.data.email).toBe(testUser.email);
            expect(res.body.data.passwordHash).toBeUndefined();
            expect(res.headers['set-cookie']).toBeDefined();
        });

        test('should reject duplicate email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    ...testUser,
                    name: 'Another User',
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email already in use');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        test('should validate missing password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testUser.password,
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        test('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword',
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        test('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Login successful');
            expect(res.body.token ?? res.body.data?.token).toBeDefined();
            expect(res.body.data).toBeDefined();
            expect(res.body.data.email).toBe(testUser.email);
            expect(res.body.data.passwordHash).toBeUndefined();
        });

        test('should return user role in response', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.role).toBeDefined();
            expect(res.body.data.role).toBe('user');
        });
    });

    describe('Session endpoints', () => {
        test('GET /api/v1/auth/me should reject unauthenticated request', async () => {
            const res = await request(app).get('/api/v1/auth/me');
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('GET /api/v1/auth/me should return authenticated user', async () => {
            const agent = request.agent(app);

            const loginRes = await agent
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            expect(loginRes.statusCode).toBe(200);

            const meRes = await agent.get('/api/v1/auth/me');
            expect(meRes.statusCode).toBe(200);
            expect(meRes.body.success).toBe(true);
            expect(meRes.body.data.email).toBe(testUser.email);
        });

        test('GET /api/v1/auth/sessions should return active session list', async () => {
            const agent = request.agent(app);
            await agent
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            const sessionsRes = await agent.get('/api/v1/auth/sessions');
            expect(sessionsRes.statusCode).toBe(200);
            expect(sessionsRes.body.success).toBe(true);
            expect(Array.isArray(sessionsRes.body.data)).toBe(true);
            expect(sessionsRes.body.data.length).toBeGreaterThan(0);
            expect(sessionsRes.body.data[0].current).toBe(true);
        });

        test('POST /api/v1/auth/sessions/revoke should revoke current session', async () => {
            const agent = request.agent(app);
            await agent
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            const revokeRes = await agent
                .post('/api/v1/auth/sessions/revoke')
                .send({});

            expect(revokeRes.statusCode).toBe(200);
            expect(revokeRes.body.success).toBe(true);

            const meRes = await agent.get('/api/v1/auth/me');
            expect(meRes.statusCode).toBe(401);
        });
    });

    describe('Verification challenge flow', () => {
        test('issue challenge and verify with valid dev code', async () => {
            const agent = request.agent(app);
            await agent
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            const challengeRes = await agent
                .post('/api/v1/auth/verification/challenge')
                .send({ channel: 'email' });

            expect(challengeRes.statusCode).toBe(201);
            expect(challengeRes.body.success).toBe(true);

            const challengeId = challengeRes.body.data?.challengeId as string;
            const devCode = challengeRes.body.data?.devCode as string;

            expect(typeof challengeId).toBe('string');
            expect(challengeId.length).toBeGreaterThan(0);
            expect(typeof devCode).toBe('string');
            expect(devCode.length).toBe(6);

            const verifyRes = await agent
                .post('/api/v1/auth/verification/submit')
                .send({ challengeId, code: devCode });

            expect(verifyRes.statusCode).toBe(200);
            expect(verifyRes.body.success).toBe(true);
            expect(verifyRes.body.message).toBe('Verification successful');
        });

        test('verification should reject wrong challenge code', async () => {
            const agent = request.agent(app);
            await agent
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            const challengeRes = await agent
                .post('/api/v1/auth/verification/challenge')
                .send({ channel: 'email' });

            const challengeId = challengeRes.body.data?.challengeId as string;

            const verifyRes = await agent
                .post('/api/v1/auth/verification/submit')
                .send({ challengeId, code: '000000' });

            expect(verifyRes.statusCode).toBe(400);
            expect(verifyRes.body.success).toBe(false);
            expect(verifyRes.body.message).toBe('Invalid challenge code');
        });
    });
});
