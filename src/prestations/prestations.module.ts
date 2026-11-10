import { Module } from '@nestjs/common';
import { PrestationsController } from './prestations.controller';
import { PrestationsService } from './prestations.service';
import { NotificationsInAppModule } from '../notifications-inapp/notifications-inapp.module';


@Module({
  imports: [NotificationsInAppModule],
  controllers: [PrestationsController],
  providers: [PrestationsService],
  exports: [PrestationsService],
})
export class PrestationsModule {}