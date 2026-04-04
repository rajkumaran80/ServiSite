import { Module } from '@nestjs/common';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';
import { NotificationsModule } from '../../common/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OrderingController],
  providers: [OrderingService],
  exports: [OrderingService],
})
export class OrderingModule {}
