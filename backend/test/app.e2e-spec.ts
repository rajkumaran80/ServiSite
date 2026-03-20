import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('ServiSite E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let tenantId: string;
  let tenantSlug: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api/v1');

    await app.init();

    prisma = app.get(PrismaService);
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
      refreshToken = response.body.data.refreshToken; // rotate
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
    let categoryId: string;
    let menuItemId: string;

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

      // Using same refresh token again should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
