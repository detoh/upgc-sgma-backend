import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionCronService } from './subscription-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [SubscriptionCronService],
  exports: [SubscriptionCronService],
})
export class SubscriptionCronModule {}