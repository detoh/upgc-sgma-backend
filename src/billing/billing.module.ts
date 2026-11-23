import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionCronModule } from './cron/subscription-cron.module';
import { CinetpayService } from './services/cinetpay.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    SubscriptionCronModule,  // 🆕 Importer le module cron
  ],
  controllers: [BillingController],
  providers: [BillingService, CinetpayService],
  exports: [BillingService],
})
export class BillingModule {}