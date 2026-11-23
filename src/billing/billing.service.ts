import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { ValiderPaiementDto } from './dto/valider-paiement.dto';
import { StatutPaiement, ModePaiement } from '@prisma/client';
import { CinetpayService } from './services/cinetpay.service';


@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);
  constructor(
    private prisma: PrismaService,
    private cinetpayService: CinetpayService,
  ) {}

  // ==========================================
  // RÉCUPÉRER LES PLANS DISPONIBLES
  // ==========================================
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { actif: true },
      orderBy: { prixMensuel: 'asc' },
    });
  }

  // ==========================================
  // STATUT DE L'ABONNEMENT D'UNE ORGANISATION
  // ==========================================
  async getStatutAbonnement(organisationId: bigint) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        id: true,
        nom: true,
        slug: true,
        plan: true,
        statutAbonnement: true,
        dateDebutEssai: true,
        dateFinEssai: true,
        dateExpirationAbonnement: true,
        planId: true,
      },
    });

    if (!organisation) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // Récupérer le plan de facturation lié
    const planFacturation = organisation.planId
      ? await this.prisma.plan.findUnique({
          where: { id: organisation.planId },
        })
      : null;

    // Calculer les jours restants
    const now = new Date();
    const expiration = organisation.dateExpirationAbonnement;
    const joursRestants = expiration
      ? Math.max(0, Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      organisation: {
        id: organisation.id.toString(),
        nom: organisation.nom,
        slug: organisation.slug,
      },
      abonnement: {
        statut: organisation.statutAbonnement,
        dateDebutEssai: organisation.dateDebutEssai,
        dateFinEssai: organisation.dateFinEssai,
        dateExpiration: organisation.dateExpirationAbonnement,
        joursRestants,
        estExpiré: expiration ? expiration < now : false,
        estEnEssai: organisation.dateFinEssai ? organisation.dateFinEssai > now : false,
      },
      planActuel: planFacturation
        ? {
            id: planFacturation.id.toString(),
            type: planFacturation.type,
            nom: planFacturation.nom,
            prixMensuel: planFacturation.prixMensuel,
            prixAnnuel: planFacturation.prixAnnuel,
          }
        : null,
    };
  }

  // ==========================================
  // CRÉER UN PAIEMENT (CASH ou CINETPAY)
  // ==========================================
  async createPaiement(organisationId: bigint, dto: CreatePaiementDto, userId: bigint) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(dto.planId) },
    });

    if (!plan) throw new NotFoundException('Plan non trouvé');
    if (!plan.actif) throw new BadRequestException('Ce plan n\'est plus disponible');

    const montant = dto.periode === 'MENSUEL' ? plan.prixMensuel : plan.prixAnnuel;
    if (montant === 0) throw new BadRequestException('Le plan Gratuit ne nécessite pas de paiement');

    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Créer le paiement en base
    const paiement = await this.prisma.paiement.create({
      data: {
        organisationId,
        planId: BigInt(dto.planId),
        montant,
        modePaiement: dto.modePaiement,
        statut: StatutPaiement.EN_ATTENTE,
        periode: dto.periode,
        reference,
        metadata: dto.numeroTelephone ? { numeroTelephone: dto.numeroTelephone } : undefined,
        dateCreation: now,
      },
      include: {
        plan: true,
        organisation: { select: { id: true, nom: true, slug: true } },
      },
    });

    // Journaliser
    await this.prisma.journalEvenement.create({
      data: {
        organisationId,
        type: 'PAIEMENT_INITIE',
        description: `Paiement ${dto.modePaiement} de ${montant} XOF initié (${dto.periode})`,
        metadata: { paiementId: paiement.id.toString(), reference },
      },
    });

    // Si CASH → retour simple
    if (dto.modePaiement === ModePaiement.CASH) {
      return {
        paiement: {
          id: paiement.id.toString(),
          reference: paiement.reference,
          montant: paiement.montant,
          modePaiement: paiement.modePaiement,
          statut: paiement.statut,
          periode: paiement.periode,
        },
        plan: { id: plan.id.toString(), nom: plan.nom, type: plan.type },
        message: 'Paiement en espèces enregistré. En attente de validation par un administrateur.',
      };
    }

    // Si CINETPAY → initialiser le paiement mobile
    if (dto.modePaiement === ModePaiement.CINETPAY) {
      if (!dto.numeroTelephone) {
        throw new BadRequestException('Numéro de téléphone requis pour Mobile Money');
      }

      try {
        const cinetpayResult = await this.cinetpayService.initializePayment({
          transactionId: paiement.reference,
          montant,
          description: `Abonnement ${plan.nom} - ${paiement.organisation.nom}`,
          numeroTelephone: dto.numeroTelephone,
          currency: 'XOF',
        });

        return {
          paiement: {
            id: paiement.id.toString(),
            reference: paiement.reference,
            montant: paiement.montant,
            modePaiement: paiement.modePaiement,
            statut: paiement.statut,
            periode: paiement.periode,
          },
          plan: { id: plan.id.toString(), nom: plan.nom, type: plan.type },
          paymentUrl: cinetpayResult.paymentUrl,
          message: 'Vous allez être redirigé vers la page de paiement Mobile Money.',
        };
      } catch (error) {
        await this.prisma.paiement.update({
          where: { id: paiement.id },
          data: { statut: StatutPaiement.ANNULE },
        });
        throw error;
      }
    }

    throw new BadRequestException('Mode de paiement non supporté');
  }

  // ==========================================
  // VALIDER UN PAIEMENT CASH (par SUPER_ADMIN)
  // ==========================================
  async validerPaiementCash(paiementId: bigint, dto: ValiderPaiementDto, valideParId: bigint) {
    const paiement = await this.prisma.paiement.findUnique({
      where: { id: paiementId },
      include: { organisation: true, plan: true },
    });

    if (!paiement) {
      throw new NotFoundException('Paiement non trouvé');
    }

    if (paiement.statut !== StatutPaiement.EN_ATTENTE) {
      throw new BadRequestException('Ce paiement a déjà été traité');
    }

    if (!dto.approuve) {
      // Rejeter le paiement
      await this.prisma.paiement.update({
        where: { id: paiementId },
        data: {
          statut: StatutPaiement.ANNULE,
          metadata: { motifRejet: dto.motifRejet },
        },
      });

      return { message: 'Paiement rejeté', statut: 'ANNULE' };
    }

    // Approuver et activer l'abonnement
    const now = new Date();
    const dateExpiration = new Date(now);
    if (paiement.periode === 'MENSUEL') {
      dateExpiration.setMonth(dateExpiration.getMonth() + 1);
    } else {
      dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
    }

    // Transaction : mettre à jour paiement + organisation
    await this.prisma.$transaction([
      // Mettre à jour le paiement
      this.prisma.paiement.update({
        where: { id: paiementId },
        data: {
          statut: StatutPaiement.SUCCES,
          datePaiement: now,
          dateExpiration,
          valideParId,
          referenceExterne: dto.referenceExterne,
        },
      }),
      // Activer l'abonnement de l'organisation
      // ✅ APRÈS
      this.prisma.organisation.update({
        where: { id: paiement.organisationId },
        data: {
          statutAbonnement: 'ACTIF',
          planId: paiement.planId,
          dateExpirationAbonnement: dateExpiration,
          dateFinEssai: null,
        },
      }),
      // Journaliser
      this.prisma.journalEvenement.create({
        data: {
          organisationId: paiement.organisationId,
          type: 'PAIEMENT_VALIDE',
          description: `Paiement ${paiement.modePaiement} de ${paiement.montant} XOF validé - Abonnement activé jusqu'au ${dateExpiration.toLocaleDateString('fr-FR')}`,
          metadata: { paiementId: paiement.id.toString(), valideParId: valideParId.toString() },
        },
      }),
    ]);

    return {
      message: 'Paiement validé. Abonnement activé avec succès.',
      statut: 'SUCCES',
      dateExpiration,
    };
  }

  // ==========================================
  // HISTORIQUE DES PAIEMENTS
  // ==========================================
  async getHistoriquePaiements(organisationId: bigint) {
    return this.prisma.paiement.findMany({
      where: { organisationId },
      include: {
        plan: {
          select: { id: true, nom: true, type: true },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  // ==========================================
  // LISTE DES PAIEMENTS EN ATTENTE (pour SUPER_ADMIN)
  // ==========================================
  async getPaiementsEnAttente() {
    return this.prisma.paiement.findMany({
      where: { statut: StatutPaiement.EN_ATTENTE },
      include: {
        organisation: {
          select: { id: true, nom: true, slug: true },
        },
        plan: {
          select: { id: true, nom: true, type: true },
        },
      },
      orderBy: { dateCreation: 'asc' },
    });
  }
 /**
 * Gérer le webhook CinetPay (confirmation de paiement)
 */
  async handleCinetpayWebhook(payload: any) {
    const transactionId = payload.transaction_id || payload.data?.transaction_id;
    const status = payload.status || payload.data?.status;

    this.logger.log(`📥 Webhook CinetPay: ${transactionId} - ${status}`);

    const paiement = await this.prisma.paiement.findFirst({
      where: { reference: transactionId },
      include: { organisation: true, plan: true },
    });

    if (!paiement) {
      this.logger.warn(`Paiement non trouvé: ${transactionId}`);
      return { message: 'Paiement non trouvé' };
    }

    if (status === 'ACCEPTED' || status === 'SUCCESS') {
      const now = new Date();
      const dateExpiration = new Date(now);
      if (paiement.periode === 'MENSUEL') {
        dateExpiration.setMonth(dateExpiration.getMonth() + 1);
      } else {
        dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
      }

      await this.prisma.$transaction([
        this.prisma.paiement.update({
          where: { id: paiement.id },
          data: {
            statut: StatutPaiement.SUCCES,
            datePaiement: now,
            dateExpiration,
            metadata: { ...(paiement.metadata as Record<string, any> || {}), webhookPayload: payload },
          },
        }),
        this.prisma.organisation.update({
          where: { id: paiement.organisationId },
          data: {
            statutAbonnement: 'ACTIF',
            planId: paiement.planId,
            dateExpirationAbonnement: dateExpiration,
            dateFinEssai: null,
          },
        }),
        this.prisma.journalEvenement.create({
          data: {
            organisationId: paiement.organisationId,
            type: 'PAIEMENT_CINETPAY_VALIDE',
            description: `Paiement Mobile Money de ${paiement.montant} XOF confirmé automatiquement`,
            metadata: { paiementId: paiement.id.toString(), transactionId },
          },
        }),
      ]);

      this.logger.log(`✅ Abonnement activé pour ${paiement.organisation.nom}`);
      return { message: 'Paiement confirmé et abonnement activé' };
    } else {
      await this.prisma.paiement.update({
        where: { id: paiement.id },
        data: { statut: StatutPaiement.ECHOUE },
      });
      return { message: 'Paiement échoué' };
    }
  }

  /**
   * Simuler la confirmation d'un paiement (mode test)
   */
  async simulerConfirmationPaiement(reference: string) {
    return this.handleCinetpayWebhook({
      transaction_id: reference,
      status: 'ACCEPTED',
    });
  }
  }