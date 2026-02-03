import request from 'supertest';
import app from '../../app';
import { UserModel } from '../../models/user.model';

describe('Admin User Management API Integration Tests', () => {
    const unique = Date.now();

    let adminToken = '';
    let userToken = '';
    let testUserId = '';

    const adminCredentials = {
        name: 'Admin Test',
        email: `admin.test.${unique}@example.com`,
        password: 'admin123',
        location: 'Kathmandu',
    };

    const regularUserCredentials = {
        name: 'Regular User',
        email: `regular.test.${unique}@example.com`,
        password: 'user1234',
        location: 'Pokhara',
    };

    const newUser = {
        firstName: 'New',
        lastName: 'User',
        email: `newuser.${unique}@example.com`,
        password: 'password123',
        role: 'user',
        location: 'Lalitpur',
    };

    beforeAll(async () => {
        await UserModel.deleteMany({
            email: {
                $in: [
                    adminCredentials.email,
                    regularUserCredentials.email,
                    newUser.email,
                ],
            },
        });

        await request(app).post('/api/v1/auth/register').send(adminCredentials);
        await UserModel.findOneAndUpdate(
            { email: adminCredentials.email },
            { role: 'admin' }
        );

        await request(app)
            .post('/api/v1/auth/register')
            .send(regularUserCredentials);

        const adminLoginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: adminCredentials.email,
                password: adminCredentials.password,
            });
        adminToken =
            adminLoginRes.body.token ?? adminLoginRes.body.data?.token ?? '';

        const userLoginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: regularUserCredentials.email,
                password: regularUserCredentials.password,
            });
        userToken = userLoginRes.body.token ?? userLoginRes.body.data?.token ?? '';
    });

    afterAll(async () => {
        await UserModel.deleteMany({
            email: {
                $in: [
                    adminCredentials.email,
                    regularUserCredentials.email,
                    newUser.email,
                ],
            },
        });
    });

    describe('POST /api/admin/users', () => {
        test('should reject request without token', async () => {
            const res = await request(app).post('/api/admin/users').send(newUser);

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Unauthorized');
        });

        test('should reject request with invalid token', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', 'Bearer invalid-token')
                .send(newUser);

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('should reject non-admin user', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newUser);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Forbidden');
        });

        test('should create user as admin', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(newUser.email);
            expect(res.body.data.password).toBeUndefined();
            expect(res.body.data.passwordHash).toBeUndefined();

            testUserId = res.body.data.userId;
            expect(typeof testUserId).toBe('string');
            expect(testUserId.length).toBeGreaterThan(0);
        });

        test('should validate missing fields when creating user', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/admin/users', () => {
        test('should reject request without token', async () => {
            const res = await request(app).get('/api/admin/users');

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('should reject non-admin user', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        test('should get all users with pagination', async () => {
            const res = await request(app)
                .get('/api/admin/users?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.meta.page).toBe(1);
            expect(res.body.meta.limit).toBe(10);
            expect(res.body.meta.total).toBeDefined();
            expect(res.body.meta.totalPages).toBeDefined();
        });

        test('should filter users by search query', async () => {
            const res = await request(app)
                .get('/api/admin/users?search=Admin')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        test('should not return passwords in user list', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            res.body.data.forEach((user: any) => {
                expect(user.password).toBeUndefined();
                expect(user.passwordHash).toBeUndefined();
            });
        });
    });

    describe('GET /api/admin/users/:userId', () => {
        test('should reject request without token', async () => {
            const res = await request(app).get(`/api/admin/users/${testUserId}`);

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('should reject non-admin user', async () => {
            const res = await request(app)
                .get(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        test('should get user by ID as admin', async () => {
            const res = await request(app)
                .get(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.userId).toBe(testUserId);
            expect(res.body.data.password).toBeUndefined();
            expect(res.body.data.passwordHash).toBeUndefined();
        });

        test('should return 404 for non-existent user', async () => {
            const res = await request(app)
                .get('/api/admin/users/non-existent-user-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('PATCH /api/admin/users/:userId', () => {
        test('should reject request without token', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${testUserId}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('should reject non-admin user', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        test('should update user firstName as admin', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toContain('Updated');
        });

        test('should return 404 for non-existent user', async () => {
            const res = await request(app)
                .patch('/api/admin/users/non-existent-user-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('DELETE /api/admin/users/:userId', () => {
        test('should reject request without token', async () => {
            const res = await request(app).delete(`/api/admin/users/${testUserId}`);

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('should reject non-admin user', async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        test('should return 404 for non-existent user', async () => {
            const res = await request(app)
                .delete('/api/admin/users/non-existent-user-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });

        test('should delete user as admin', async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.userId).toBe(testUserId);
        });

        test('should confirm user is deleted', async () => {
            const res = await request(app)
                .get(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
});
