import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MenuModule } from './modules/menu/menu.module';
import { MediaModule } from './modules/media/media.module';
import { ContactModule } from './modules/contact/contact.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { SuperAdminModule } from './modules/superadmin/superadmin.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { PagesModule } from './modules/pages/pages.module';
import { PageEntriesModule } from './modules/page-entries/page-entries.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { InternalSecretMiddleware } from './common/middleware/internal-secret.middleware';
import { CacheModule } from './common/cache/cache.module';
import { NotifyModule } from './common/notify/notify.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    ThrottlerModule.forRoot([
      // General API: 100 requests per minute per IP
      { name: 'api', ttl: 60_000, limit: 100 },
    ]),
    CacheModule,
    NotifyModule,
    PrismaModule,
    AuthModule,
    TenantModule,
    MenuModule,
    MediaModule,
    ContactModule,
    GalleryModule,
    SuperAdminModule,
    NavigationModule,
    PagesModule,
    PageEntriesModule,
  ],
  controllers: [AppController],
  providers: [
    // Rate limiting applied globally — use @SkipThrottle() to opt out
    // Use @Throttle({ api: { limit: 5 } }) on auth routes for stricter limits
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(InternalSecretMiddleware)
      .exclude(
        { path: 'api/v1/health', method: RequestMethod.ALL },
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');

    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/health', method: RequestMethod.ALL },
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/tenant', method: RequestMethod.POST },
        { path: 'api/v1/tenant', method: RequestMethod.GET },
        { path: 'docs/(.*)', method: RequestMethod.ALL },
        { path: 'docs', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
