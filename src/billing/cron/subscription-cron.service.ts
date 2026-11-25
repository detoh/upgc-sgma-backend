import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../emails/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private prisma: PrismaService, 
    private emailService: EmailService,
    private configService: ConfigService, 
  ) {}

  // =================
  // =========================
  // CRON PRINCIPAL : Tous les jours à minuit
  // Vérifie les expirations et suspend les organisations
  // ==========================================
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiry() {
    this.logger.log('🕒 Début du traitement des abonnements expirés...');

    const now = new Date();

    // 1. Passer en EXPIRE les organisations dont la date est dépassée
    const expiredOrgs = await this.prisma.organisation.updateMany({
      where: {
        dateExpirationAbonnement: { lt: now },
        statutAbonnement: 'ACTIF',
      },
      data: {
        statutAbonnement: 'EXPIRE',
      },
    });

    if (expiredOrgs.count > 0) {
      this.logger.warn(`⚠️ ${expiredOrgs.count} organisation(s) passée(s) en statut EXPIRE`);

      // Journaliser
      for (const org of await this.prisma.organisation.findMany({
        where: {
          dateExpirationAbonnement: { lt: now },
          statutAbonnement: 'EXPIRE',
        },
        select: { id: true, nom: true },
      })) {
        await this.prisma.journalEvenement.create({
          data: {
            organisationId: org.id,
            type: 'ABONNEMENT_EXPIRE',
            description: `Abonnement expiré automatiquement par le système`,
            metadata: { expiréLe: now.toISOString() },
          },
        });
      }
    }

    // 2. Suspendre les organisations expirées depuis plus de 7 jours
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const suspendedOrgs = await this.prisma.organisation.updateMany({
      where: {
        dateExpirationAbonnement: { lt: sevenDaysAgo },
        statutAbonnement: 'EXPIRE',
      },
      data: {
        statutAbonnement: 'SUSPENDU',
      },
    });

    if (suspendedOrgs.count > 0) {
      this.logger.warn(`🚫 ${suspendedOrgs.count} organisation(s) suspendue(s) après 7 jours d'expiration`);

      for (const org of await this.prisma.organisation.findMany({
        where: {
          dateExpirationAbonnement: { lt: sevenDaysAgo },
          statutAbonnement: 'SUSPENDU',
        },
        select: { id: true, nom: true },
      })) {
        await this.prisma.journalEvenement.create({
          data: {
            organisationId: org.id,
            type: 'ABONNEMENT_SUSPENDU',
            description: `Abonnement suspendu automatiquement après 7 jours d'expiration`,
            metadata: { suspenduLe: now.toISOString() },
          },
        });
      }
    }

    this.logger.log('✅ Traitement des abonnements expirés terminé');
  }

  // ==========================================
  // CRON NOTIFICATIONS : Tous les jours à 9h
  // Envoie des rappels J-7, J-3, J-1
  // ==========================================
  @Cron('0 9 * * *')
  async handleExpirationNotifications() {
    this.logger.log('📧 Vérification des notifications d\'expiration...');

    const now = new Date();

    // J-7 : organisations qui expirent dans 7 jours
    await this.notifyExpiringOrganisations(7);

    // J-3 : organisations qui expirent dans 3 jours
    await this.notifyExpiringOrganisations(3);

    // J-1 : organisations qui expirent demain
    await this.notifyExpiringOrganisations(1);

    this.logger.log('✅ Notifications d\'expiration traitées');
  }

  // ==========================================
  // Méthode helper pour notifier
  // ==========================================
  private async notifyExpiringOrganisations(daysBeforeExpiry: number) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const organisations = await this.prisma.organisation.findMany({
      where: {
        dateExpirationAbonnement: {
          gte: startOfDay,
          lte: endOfDay,
        },
        statutAbonnement: 'ACTIF',
      },
      select: {
        id: true,
        nom: true,
        slug: true,
        email: true,
      },
    });

    if (organisations.length === 0) return;

    this.logger.log(`📢 ${organisations.length} organisation(s) à notifier pour J-${daysBeforeExpiry}`);

    for (const org of organisations) {
      // Vérifier si déjà notifié aujourd'hui
      const existingNotification = await this.prisma.journalEvenement.findFirst({
        where: {
          organisationId: org.id,
          type: `NOTIFICATION_J${daysBeforeExpiry}`,
          dateCreation: { gte: startOfDay },
        },
      });

      if (existingNotification) {
        this.logger.log(`ℹ️ ${org.nom} déjà notifié aujourd'hui pour J-${daysBeforeExpiry}`);
        continue;
      }

      // Envoyer l'email (UN SEUL appel)
      const result = await this.sendExpirationEmail(org, daysBeforeExpiry);

      // Journaliser et logger
      if (result.success) {
        await this.prisma.journalEvenement.create({
          data: {
            organisationId: org.id,
            type: `NOTIFICATION_J${daysBeforeExpiry}`,
            description: `Email de rappel envoyé : expiration dans ${daysBeforeExpiry} jour(s)`,
            metadata: {
              joursRestants: daysBeforeExpiry,
            },
          },
        });
        this.logger.log(`✅ Notification J-${daysBeforeExpiry} envoyée à ${org.nom}`);
      } else {
        this.logger.error(`❌ Échec envoi rappel J-${daysBeforeExpiry} à ${org.nom}`);
      }
    }
  }

  // ==========================================
  // Envoyer l'email d'expiration
  // ==========================================
  private async sendExpirationEmail(org: any, daysRemaining: number) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const lienRenouvellement = `${frontendUrl}/dashboard/billing`;

    // Récupérer l'email de l'admin de l'organisation
    const admin = await this.prisma.utilisateur.findFirst({
      where: {
        organisationId: org.id,
        role: 'ADMIN',
        actif: true,
      },
      select: { email: true, nom: true, prenom: true },
    });

    // Validation : pas d'admin ou pas d'email
    if (!admin || !admin.email) {
      this.logger.warn(`⚠️ Aucun email admin valide pour ${org.nom}`);
      return { success: false };
    }

    const result = await this.emailService.sendExpirationReminder({
      to: admin.email,
      nomOrganisation: org.nom,
      joursRestants: daysRemaining,
      dateExpiration: new Date(),
      lienRenouvellement,
    });

    return result;
  }

  // ==========================================
  // Méthode pour déclencher manuellement (pour tests)
  // ==========================================
  async triggerManually() {
    this.logger.log('🔧 Déclenchement manuel du traitement...');
    await this.handleSubscriptionExpiry();
    await this.handleExpirationNotifications();
    return { message: 'Traitement manuel terminé' };
  }
}