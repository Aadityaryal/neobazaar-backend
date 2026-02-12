import request from 'supertest';
import app from '../../app';

describe('API Envelope Contract', () => {
    test('GET / returns canonical success envelope', async () => {
        const res = await request(app).get('/');

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
            success: true,
            message: expect.any(String),
            data: expect.any(Object),
            errors: [],
        });
        expect(res.body.meta?.requestId).toBeTruthy();
    });

    test('Unknown route returns canonical error envelope', async () => {
        const res = await request(app).get('/api/does-not-exist');

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.data).toBeNull();
        expect(Array.isArray(res.body.errors)).toBe(true);
        expect(res.body.errors.length).toBeGreaterThan(0);
        expect(res.body.meta?.requestId).toBeTruthy();
    });

    test('v1 ops route is available', async () => {
        const res = await request(app).get('/api/v1/ops/error-budget');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('fiveXxRate');
        expect(res.body.meta?.requestId).toBeTruthy();
    });
});
