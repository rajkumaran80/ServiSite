import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramImageController } from './instagram-image.controller';
import { InstagramService } from './instagram.service';
import { InstagramImageService } from './instagram-image.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [InstagramController, InstagramImageController],
  providers: [InstagramService, InstagramImageService, PrismaService],
  exports: [InstagramService, InstagramImageService],
})
export class InstagramModule {}
