import request from 'supertest';
import app from '../../app';
import { UserModel } from '../../models/user.model';

describe('Auth API Integration Tests', () => {
    const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
    };

    const adminUser = {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'adminuser',
        password: 'admin123',
        confirmPassword: 'admin123',
    };

    beforeAll(async () => {
        await UserModel.deleteOne({ email: testUser.email });
        await UserModel.deleteOne({ email: adminUser.email });
    });

    afterAll(async () => {
        await UserModel.deleteOne({ email: testUser.email });
        await UserModel.deleteOne({ email: adminUser.email });
    });

    describe('POST /api/auth/register', () => {
        test('should validate missing email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    firstName: testUser.firstName,
                    lastName: testUser.lastName,
                    username: testUser.username,
                    password: testUser.password,
                    confirmPassword: testUser.confirmPassword,
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    email: 'invalid-email',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate password mismatch', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    confirmPassword: 'different123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Passwords do not match');
        });

        test('should register new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User Created');
            expect(res.body.data).toBeDefined();
            expect(res.body.data.email).toBe(testUser.email);
            expect(res.body.data.username).toBe(testUser.username);
            expect(res.body.data.password).toBeUndefined();
        });

        test('should reject duplicate email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    username: 'differentusername',
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email already in use');
        });

        test('should reject duplicate username', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    email: 'different@example.com',
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Username already in use');
        });
    });

    describe('POST /api/auth/login', () => {
        test('should validate missing password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testUser.password,
                });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('User not found');
        });

        test('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
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
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Login successful');
            expect(res.body.token).toBeDefined();
            expect(res.body.data).toBeDefined();
            expect(res.body.data.email).toBe(testUser.email);
            expect(res.body.data.password).toBeUndefined();
        });

        test('should return user role in response', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.role).toBeDefined();
            expect(res.body.data.role).toBe('user');
        });
    });

    describe('POST /api/auth/forgot-password', () => {
        test('should validate missing email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'invalid-email' });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should return success even for non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('If the email exists');
        });

        test('should send reset email for existing user', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: testUser.email });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('reset link');
        });
    });

    describe('POST /api/auth/reset-password', () => {
        test('should validate missing token', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    password: 'newPassword123',
                    confirmPassword: 'newPassword123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate password length', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'some-token',
                    password: '123',
                    confirmPassword: '123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should validate password mismatch', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'some-token',
                    password: 'newPassword123',
                    confirmPassword: 'differentPassword123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Passwords do not match');
        });

        test('should fail with invalid token', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalid-token',
                    password: 'newPassword123',
                    confirmPassword: 'newPassword123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Invalid or expired');
        });
    });
});
