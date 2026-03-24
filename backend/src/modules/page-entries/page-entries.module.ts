import { Module } from '@nestjs/common';
import { PageEntriesController } from './page-entries.controller';
import { PageEntriesService } from './page-entries.service';

@Module({
  controllers: [PageEntriesController],
  providers: [PageEntriesService],
  exports: [PageEntriesService],
})
export class PageEntriesModule {}
