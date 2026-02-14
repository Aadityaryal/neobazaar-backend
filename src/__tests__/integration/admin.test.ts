import request from 'supertest';
import app from '../../app';
import { UserModel } from '../../models/user.model';

describe('Admin User Management API Integration Tests', () => {
    let adminToken: string;
    let userToken: string;
    let testUserId: string;

    const adminCredentials = {
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin.test@example.com',
        username: 'admintest',
        password: 'admin123',
        confirmPassword: 'admin123',
    };

    const regularUserCredentials = {
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular.test@example.com',
        username: 'regulartest',
        password: 'user123',
        confirmPassword: 'user123',
    };

    const newUser = {
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'user',
    };

    beforeAll(async () => {
        // Clean up test users
        await UserModel.deleteMany({
            email: { $in: [adminCredentials.email, regularUserCredentials.email, newUser.email] }
        });

        // Register admin user via API
        await request(app)
            .post('/api/auth/register')
            .send(adminCredentials);

        // Update user to admin role manually
        await UserModel.findOneAndUpdate(
            { email: adminCredentials.email },
            { role: 'admin' }
        );

        // Register regular user
        await request(app)
            .post('/api/auth/register')
            .send(regularUserCredentials);

        // Login as admin
        const adminLoginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: adminCredentials.email,
                password: adminCredentials.password,
            });
        adminToken = adminLoginRes.body.token;

        // Login as regular user
        const userLoginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: regularUserCredentials.email,
                password: regularUserCredentials.password,
            });
        userToken = userLoginRes.body.token;
    });

    afterAll(async () => {
        await UserModel.deleteMany({
            email: { $in: [adminCredentials.email, regularUserCredentials.email, newUser.email] }
        });
    });

    describe('POST /api/admin/users', () => {
        test('should reject request without token', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .send(newUser);

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
            expect(res.body.message).toBe('User Created');
            expect(res.body.data.email).toBe(newUser.email);
            expect(res.body.data.password).toBeUndefined();

            testUserId = res.body.data._id;
        });

        test('should validate missing fields when creating user', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstName: 'Test',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/admin/users', () => {
        test('should reject request without token', async () => {
            const res = await request(app)
                .get('/api/admin/users');

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
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(10);
            expect(res.body.total).toBeDefined();
            expect(res.body.totalPages).toBeDefined();
        });

        test('should filter users by search query', async () => {
            const res = await request(app)
                .get(`/api/admin/users?search=${adminCredentials.firstName}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        test('should handle custom page size', async () => {
            const res = await request(app)
                .get('/api/admin/users?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.limit).toBe(5);
        });

        test('should not return passwords in user list', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            res.body.data.forEach((user: any) => {
                expect(user.password).toBeUndefined();
            });
        });
    });

    describe('GET /api/admin/users/:id', () => {
        test('should reject request without token', async () => {
            const res = await request(app)
                .get(`/api/admin/users/${testUserId}`);

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
            expect(res.body.data._id).toBe(testUserId);
            expect(res.body.data.password).toBeUndefined();
        });

        test('should return 404 for non-existent user', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .get(`/api/admin/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('PUT /api/admin/users/:id', () => {
        test('should reject request without token', async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('should reject non-admin user', async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        test('should update user firstName as admin', async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.firstName).toBe('Updated');
        });

        test('should return 404 for non-existent user', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .put(`/api/admin/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('DELETE /api/admin/users/:id', () => {
        test('should reject request without token', async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${testUserId}`);

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
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .delete(`/api/admin/users/${fakeId}`)
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
            expect(res.body.message).toBe('User Deleted');
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
