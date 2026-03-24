import { Global, Module } from '@nestjs/common';
import { NotifyNextjsService } from './notify-nextjs.service';

@Global()
@Module({
  providers: [NotifyNextjsService],
  exports: [NotifyNextjsService],
})
export class NotifyModule {}
