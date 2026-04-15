import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaProcessorService } from './media-processor.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MediaController],
  providers: [MediaService, MediaProcessorService],
  exports: [MediaService, MediaProcessorService],
})
export class MediaModule {}
