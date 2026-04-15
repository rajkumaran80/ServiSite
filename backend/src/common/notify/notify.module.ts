import { Global, Module } from '@nestjs/common';
import { NotifyNextjsService } from './notify-nextjs.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [NotifyNextjsService],
  exports: [NotifyNextjsService],
})
export class NotifyModule {}
