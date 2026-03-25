"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const http_exception_filter_1 = require("../src/common/filters/http-exception.filter");
const transform_interceptor_1 = require("../src/common/interceptors/transform.interceptor");
describe('ServiSite E2E Tests', () => {
    let app;
    let prisma;
    let accessToken;
    let refreshToken;
    let tenantId;
    let tenantSlug;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
        }));
        app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
        app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
        app.setGlobalPrefix('api/v1');
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        await prisma.cleanDatabase();
    });
    afterAll(async () => {
        await prisma.cleanDatabase();
        await app.close();
    });
    describe('Health Check', () => {
        it('GET /health should return 200', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                expect(res.body.status).toBe('ok');
            });
        });
    });
    describe('Tenant Registration', () => {
        it('POST /api/v1/tenant should create tenant with admin user', async () => {
            tenantSlug = `test-tenant-${Date.now()}`;
            const response = await request(app.getHttpServer())
                .post('/api/v1/tenant')
                .send({
                name: 'Test Restaurant',
                slug: tenantSlug,
                type: 'RESTAURANT',
                adminEmail: `admin@${tenantSlug}.com`,
                adminPassword: 'Password123!',
                currency: 'USD',
                timezone: 'UTC',
            })
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.slug).toBe(tenantSlug);
            tenantId = response.body.data.id;
        });
        it('should reject duplicate slug', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/tenant')
                .send({
                name: 'Duplicate',
                slug: tenantSlug,
                adminEmail: `admin2@${tenantSlug}.com`,
                adminPassword: 'Password123!',
            })
                .expect(409);
        });
    });
    describe('Authentication', () => {
        it('POST /api/v1/auth/login should return tokens', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                email: `admin@${tenantSlug}.com`,
                password: 'Password123!',
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();
            accessToken = response.body.data.accessToken;
            refreshToken = response.body.data.refreshToken;
        });
        it('should reject invalid credentials', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                email: `admin@${tenantSlug}.com`,
                password: 'wrongpassword',
            })
                .expect(401);
        });
        it('POST /api/v1/auth/refresh should return new tokens', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({ refreshToken })
                .expect(200);
            expect(response.body.data.accessToken).toBeDefined();
            refreshToken = response.body.data.refreshToken;
            accessToken = response.body.data.accessToken;
        });
    });
    describe('Tenant API', () => {
        it('GET /api/v1/tenant/:slug should return public tenant data', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/tenant/${tenantSlug}`)
                .expect(200);
            expect(response.body.data.slug).toBe(tenantSlug);
            expect(response.body.data).not.toHaveProperty('users');
        });
    });
    describe('Menu API', () => {
        let categoryId;
        let menuItemId;
        it('POST /api/v1/menu/categories should create category', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/menu/categories')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ name: 'Main Course', description: 'Our signature dishes' })
                .expect(201);
            expect(response.body.success).toBe(true);
            categoryId = response.body.data.id;
        });
        it('POST /api/v1/menu/items should create menu item', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/menu/items')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                name: 'Spaghetti Bolognese',
                price: 14.99,
                categoryId,
                description: 'Classic Italian pasta',
            })
                .expect(201);
            expect(response.body.success).toBe(true);
            menuItemId = response.body.data.id;
        });
        it('PUT /api/v1/menu/items/:id should update menu item', async () => {
            const response = await request(app.getHttpServer())
                .put(`/api/v1/menu/items/${menuItemId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ price: 16.99 })
                .expect(200);
            expect(parseFloat(response.body.data.price)).toBe(16.99);
        });
        it('DELETE /api/v1/menu/items/:id should delete item', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/menu/items/${menuItemId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(204);
        });
    });
    describe('Protected routes', () => {
        it('should reject requests without auth token', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/menu/categories')
                .send({ name: 'Test' })
                .expect(401);
        });
        it('POST /api/v1/auth/logout should invalidate refresh token', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ refreshToken })
                .expect(200);
            await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({ refreshToken })
                .expect(401);
        });
    });
});
//# sourceMappingURL=app.e2e-spec.js.map