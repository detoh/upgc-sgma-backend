import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionCronService } from './subscription-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../emails/email.module'; 


@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, PrismaModule, EmailModule],
  providers: [SubscriptionCronService],
  exports: [SubscriptionCronService],
})
export class SubscriptionCronModule {}