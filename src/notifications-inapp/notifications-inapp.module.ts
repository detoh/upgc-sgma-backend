import { Module } from '@nestjs/common';
import { NotificationsInAppService } from './notifications-inapp.service';
import { NotificationsInAppController } from './notifications-inapp.controller';

@Module({
  controllers: [NotificationsInAppController],
  providers: [NotificationsInAppService],
  exports: [NotificationsInAppService],

})
export class NotificationsInAppModule {}