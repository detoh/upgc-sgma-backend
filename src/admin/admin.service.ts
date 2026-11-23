import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Statistiques globales de la plateforme
   */
  async getStats() {
    const totalOrganisations = await this.prisma.organisation.count();
    const organisationsActives = await this.prisma.organisation.count({
      where: { statutAbonnement: 'ACTIF' },
    });
    const organisationsSuspendues = await this.prisma.organisation.count({
      where: { statutAbonnement: 'SUSPENDU' },
    });
    const organisationsExpirees = await this.prisma.organisation.count({
      where: { statutAbonnement: 'EXPIRE' },
    });
    const totalMembres = await this.prisma.membre.count();
    const totalUtilisateurs = await this.prisma.utilisateur.count();
    const paiementsEnAttente = await this.prisma.paiement.count({
      where: { statut: 'EN_ATTENTE' },
    });

    // Revenu mensuel estimé (organisations ACTIF avec plan payant)
    const organisationsPayantes = await this.prisma.organisation.findMany({
      where: {
        statutAbonnement: 'ACTIF',
        planId: { not: null },
      },
      include: {
        planFacturation: {
          select: { prixMensuel: true },
        },
      },
    });

    const revenuMensuel = organisationsPayantes.reduce(
      (sum, org) => sum + (org.planFacturation?.prixMensuel || 0),
      0,
    );

    return {
      organisations: {
        total: totalOrganisations,
        actives: organisationsActives,
        suspendues: organisationsSuspendues,
        expirees: organisationsExpirees,
      },
      membres: { total: totalMembres },
      utilisateurs: { total: totalUtilisateurs },
      paiements: { enAttente: paiementsEnAttente },
      revenu: { mensuelEstime: revenuMensuel },
    };
  }

  /**
   * Liste des organisations avec filtres et pagination
   */
  async getOrganisations(params: {
    page?: number;
    limit?: number;
    statut?: string;
    recherche?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.statut && params.statut !== 'TOUS') {
      where.statutAbonnement = params.statut;
    }

    if (params.recherche) {
      where.OR = [
        { nom: { contains: params.recherche, mode: 'insensitive' } },
        { slug: { contains: params.recherche, mode: 'insensitive' } },
        { email: { contains: params.recherche, mode: 'insensitive' } },
      ];
    }

    const [organisations, total] = await Promise.all([
      this.prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateCreation: 'desc' },
        include: {
          planFacturation: {
            select: { id: true, nom: true, type: true, prixMensuel: true },
          },
          _count: {
            select: { membres: true, utilisateurs: true },
          },
        },
      }),
      this.prisma.organisation.count({ where }),
    ]);

    return {
      organisations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Détails d'une organisation
   */
  async getOrganisationDetail(id: bigint) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id },
      include: {
        planFacturation: true,
        membres: {
          select: { id: true, matricule: true, nom: true, prenom: true, statut: true },
          take: 50,
        },
        utilisateurs: {
          select: { id: true, nom: true, prenom: true, email: true, role: true },
        },
        paiements: {
          orderBy: { dateCreation: 'desc' },
          take: 10,
          include: { plan: { select: { nom: true, type: true } } },
        },
      },
    });

    if (!organisation) {
      throw new NotFoundException('Organisation non trouvée');
    }

    return organisation;
  }

  /**
   * Suspendre manuellement une organisation
   */
  async suspendreOrganisation(id: bigint, motif?: string) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id },
      include: { planFacturation: true },
    });

    if (!organisation) {
      throw new NotFoundException('Organisation non trouvée');
    }

    await this.prisma.$transaction([
      this.prisma.organisation.update({
        where: { id },
        data: { statutAbonnement: 'SUSPENDU' },
      }),
      this.prisma.journalEvenement.create({
        data: {
          organisationId: id,
          type: 'ABONNEMENT_SUSPENDU',
          description: `Suspension manuelle par SUPER_ADMIN${motif ? ` : ${motif}` : ''}`,
          metadata: { motif },
        },
      }),
    ]);

    return { message: `Organisation "${organisation.nom}" suspendue avec succès` };
  }

  /**
   * Réactiver manuellement une organisation
   */
  async reactiverOrganisation(id: bigint, joursOfferts: number = 30) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id },
    });

    if (!organisation) {
      throw new NotFoundException('Organisation non trouvée');
    }

    const nouvelleExpiration = new Date();
    nouvelleExpiration.setDate(nouvelleExpiration.getDate() + joursOfferts);

    await this.prisma.$transaction([
      this.prisma.organisation.update({
        where: { id },
        data: {
          statutAbonnement: 'ACTIF',
          dateExpirationAbonnement: nouvelleExpiration,
        },
      }),
      this.prisma.journalEvenement.create({
        data: {
          organisationId: id,
          type: 'ABONNEMENT_REACTIVE',
          description: `Réactivation manuelle par SUPER_ADMIN : ${joursOfferts} jours offerts`,
          metadata: { joursOfferts, nouvelleExpiration: nouvelleExpiration.toISOString() },
        },
      }),
    ]);

    return {
      message: `Organisation "${organisation.nom}" réactivée pour ${joursOfferts} jours`,
      dateExpiration: nouvelleExpiration,
    };
  }
}