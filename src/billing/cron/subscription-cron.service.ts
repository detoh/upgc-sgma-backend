import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
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

    // Trouver les organisations qui expirent dans X jours
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
      // Vérifier si déjà notifié (éviter les doublons)
      const existingNotification = await this.prisma.journalEvenement.findFirst({
        where: {
          organisationId: org.id,
          type: `NOTIFICATION_J${daysBeforeExpiry}`,
          dateCreation: { gte: startOfDay },
        },
      });

      if (existingNotification) {
        continue; // Déjà notifié aujourd'hui
      }

      // Envoyer l'email (à implémenter avec ton service email)
      await this.sendExpirationEmail(org, daysBeforeExpiry);

      // Journaliser la notification
      await this.prisma.journalEvenement.create({
        data: {
          organisationId: org.id,
          type: `NOTIFICATION_J${daysBeforeExpiry}`,
          description: `Email de rappel envoyé : expiration dans ${daysBeforeExpiry} jour(s)`,
          metadata: {
            joursRestants: daysBeforeExpiry,
            envoyeA: org.email,
          },
        },
      });

      this.logger.log(`📧 Notification J-${daysBeforeExpiry} envoyée à ${org.nom}`);
    }
  }

  // ==========================================
  // Envoyer l'email d'expiration
  // ==========================================
  private async sendExpirationEmail(org: any, daysRemaining: number) {
    const subject = `⚠️ Votre abonnement expire dans ${daysRemaining} jour(s)`;
    const message = `
Bonjour,

Votre abonnement pour l'organisation "${org.nom}" va expirer dans ${daysRemaining} jour(s).

Pour éviter toute interruption de service, veuillez renouveler votre abonnement dès maintenant.

Connectez-vous à votre espace : https://upgc-sgma-frontend.vercel.app/dashboard/billing

Cordialement,
L'équipe SGMA
    `;

    // TODO : Implémenter l'envoi réel avec ton service email
    // Pour l'instant, on log juste
    this.logger.log(`📤 [SIMULATION EMAIL] À: ${org.email} | Sujet: ${subject}`);
    
    // Exemple avec un service email (à adapter) :
    // await this.emailService.send({
    //   to: org.email,
    //   subject,
    //   html: message,
    // });
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