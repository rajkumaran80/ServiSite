import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody: true, // Required for Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',');

  app.setGlobalPrefix(apiPrefix);

  // Security headers — applied before anything else
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: configService.get('NODE_ENV') === 'production' ? [] : null,
        },
      },
      hsts: configService.get('NODE_ENV') === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      crossOriginEmbedderPolicy: false, // allow tenant pages to embed maps/iframes
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow subdomain origins dynamically
      const appDomain = configService.get<string>('APP_DOMAIN', 'servisite.com');
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(`.${appDomain}`) ||
        origin === `https://${appDomain}` ||
        /^https?:\/\/[^.]+\.localhost(:\d+)?$/.test(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Internal-Secret'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ServiSite API')
      .setDescription('Multi-tenant SaaS platform for restaurants and local businesses')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('menu', 'Menu and category management')
      .addTag('media', 'File upload')
      .addTag('contact', 'Contact information')
      .addTag('gallery', 'Gallery management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  console.log(`ServiSite API running on http://localhost:${port}/${apiPrefix}`);
  if (configService.get('NODE_ENV') !== 'production') {
    console.log(`Swagger docs: http://localhost:${port}/docs`);
  }
}

bootstrap();

