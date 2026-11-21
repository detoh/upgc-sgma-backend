import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionCronModule } from './cron/subscription-cron.module';

@Module({
  imports: [
    PrismaModule,
    SubscriptionCronModule,  // 🆕 Importer le module cron
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}