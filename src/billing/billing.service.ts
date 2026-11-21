import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { ValiderPaiementDto } from './dto/valider-paiement.dto';
import { StatutPaiement, ModePaiement } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

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
    // Vérifier le plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(dto.planId) },
    });

    if (!plan) {
      throw new NotFoundException('Plan non trouvé');
    }

    if (!plan.actif) {
      throw new BadRequestException('Ce plan n\'est plus disponible');
    }

    // Calculer le montant
    const montant = dto.periode === 'MENSUEL' ? plan.prixMensuel : plan.prixAnnuel;

    if (montant === 0) {
      throw new BadRequestException('Le plan Gratuit ne nécessite pas de paiement');
    }

    // Générer une référence unique
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculer la date d'expiration
    const now = new Date();
    const dateExpiration = new Date(now);
    if (dto.periode === 'MENSUEL') {
      dateExpiration.setMonth(dateExpiration.getMonth() + 1);
    } else {
      dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
    }

    // Créer le paiement
    const paiement = await this.prisma.paiement.create({
      data: {
        organisationId,
        planId: BigInt(dto.planId),
        montant,
        modePaiement: dto.modePaiement,
        statut: dto.modePaiement === ModePaiement.CASH ? StatutPaiement.EN_ATTENTE : StatutPaiement.EN_ATTENTE,
        periode: dto.periode,
        reference,
        metadata: dto.numeroTelephone ? { numeroTelephone: dto.numeroTelephone } : undefined,
        dateCreation: now,
      },
      include: {
        plan: true,
        organisation: {
          select: { id: true, nom: true, slug: true },
        },
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

    return {
      paiement: {
        id: paiement.id.toString(),
        reference: paiement.reference,
        montant: paiement.montant,
        modePaiement: paiement.modePaiement,
        statut: paiement.statut,
        periode: paiement.periode,
        dateExpiration: paiement.dateExpiration,
      },
      plan: {
        id: plan.id.toString(),
        nom: plan.nom,
        type: plan.type,
      },
      message: dto.modePaiement === ModePaiement.CASH
        ? 'Paiement en espèces enregistré. En attente de validation par un administrateur.'
        : 'Paiement initié. Vous allez être redirigé vers la page de paiement.',
    };
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
}