import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembresModule } from './membres/membres.module'; 
import { CotisationsModule } from './cotisations/cotisations.module'; 
import { PrestationsModule } from './prestations/prestations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ParametresModule } from './parametres/parametres.module'; // 👈 AJOUT
import { ActivitesModule } from './activites/activites.module'; // 👈 AJOUT
import { DonsModule } from './dons/dons.module';
import { RapportsModule } from './rapports/rapports.module'; // 👈 AJOUT
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { NotificationsModule } from './notifications/notifications.module';// 👈 AJOUT
import { NotificationsInAppModule } from './notifications-inapp/notifications-inapp.module';
import { EmailModule } from './common/email/email.module';
import { SubscriptionGuard } from './billing/guards/subscription.guard';
import { BillingModule } from './billing/billing.module';
import { SubscriptionCronModule } from './billing/cron/subscription-cron.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AdminModule } from './admin/admin.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule, 
    MembresModule, 
    CotisationsModule, 
    PrestationsModule, 
    DashboardModule, 
    ParametresModule, 
    ActivitesModule, 
    DonsModule, 
    RapportsModule, 
    UtilisateursModule, 
    NotificationsModule,
    NotificationsInAppModule,
    EmailModule,
    BillingModule,
    SubscriptionCronModule,
    OnboardingModule,
    AdminModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}