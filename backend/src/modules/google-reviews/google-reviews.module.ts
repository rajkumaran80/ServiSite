import { Module } from '@nestjs/common';
import { GoogleReviewsController } from './google-reviews.controller';
import { GoogleReviewsService } from './google-reviews.service';
import { CacheModule } from '../../common/cache/cache.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [CacheModule, PrismaModule],
  controllers: [GoogleReviewsController],
  providers: [GoogleReviewsService],
})
export class GoogleReviewsModule {}
