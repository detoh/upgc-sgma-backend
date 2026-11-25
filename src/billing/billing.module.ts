import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionCronModule } from './cron/subscription-cron.module';
import { CinetpayService } from './services/cinetpay.service';
import { EmailModule } from '../emails/email.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EmailModule,
    SubscriptionCronModule,  // 🆕 Importer le module cron
  ],
  controllers: [BillingController],
  providers: [BillingService, CinetpayService],
  exports: [BillingService],
})
export class BillingModule {}