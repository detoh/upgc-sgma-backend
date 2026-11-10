import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule, // 👈 AJOUT
    MembresModule, // 👈 AJOUT
    CotisationsModule, // 👈 AJOUT
    PrestationsModule, // 👈 AJOUT
    DashboardModule, // 👈 AJOUT
    ParametresModule, // 👈 AJOUT
    ActivitesModule, // 👈 AJOUT
    DonsModule, 
    RapportsModule, // 👈 AJOUT
    UtilisateursModule, // 👈 AJOUT
    NotificationsModule,
    NotificationsInAppModule,
    EmailModule, // 👈 AJOUT
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}