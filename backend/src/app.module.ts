import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MenuModule } from './modules/menu/menu.module';
import { MediaModule } from './modules/media/media.module';
import { ContactModule } from './modules/contact/contact.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    MenuModule,
    MediaModule,
    ContactModule,
    GalleryModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/tenant', method: RequestMethod.POST },
        { path: 'api/v1/tenant', method: RequestMethod.GET },
        { path: 'docs/(.*)', method: RequestMethod.ALL },
        { path: 'docs', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
