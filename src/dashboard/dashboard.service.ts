import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // STATISTIQUES GLOBALES
  // ==========================================
  async getStats() {
    const stats = await this.prisma.vueDashboardStats.findFirst();
    
    return {
      membres: {
        actifs: Number(stats?.totalMembresActifs || 0),
        suspendus: Number(stats?.totalMembresSuspendus || 0),
        ayantsDroit: Number(stats?.totalAyantsDroit || 0),
      },
      cotisations: {
        montantMoisCourant: Number(stats?.cotisationsMontantMoisCourant || 0),
        nombreMoisCourant: Number(stats?.cotisationsNbMoisCourant || 0),
      },
      prestations: {
        enAttente: Number(stats?.prestationsEnAttente || 0),
        montantMoisCourant: Number(stats?.prestationsMontantMoisCourant || 0),
      },
      activites: {
        aVenir: Number(stats?.activitesAVenir || 0),
      },
    };
  }

  // ==========================================
  // MEMBRES (Vue complète)
  // ==========================================
  async getMembres(options?: { search?: string; statut?: string; limit?: number }) {
    const { search, statut, limit = 20 } = options || {};

    // Construction du filtre
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statut) {
      where.statut = statut;
    }

    return this.prisma.vueMembresComplet.findMany({
      where,
      take: limit,
      orderBy: { nom: 'asc' },
    });
  }

  // ==========================================
  // COTISATIONS IMPAYÉES
  // ==========================================
  async getCotisationsImpayees() {
    return this.prisma.vueSituationCotisations.findMany({
      where: {
        statut: 'EN_ATTENTE',
      },
      orderBy: { periode: 'asc' },
      take: 50, // Limiter à 50 résultats
    });
  }

  // ==========================================
  // PRESTATIONS EN ATTENTE
  // ==========================================
  async getPrestationsEnAttente() {
    return this.prisma.vuePrestationsEnAttente.findMany({
      orderBy: { dateEvenement: 'asc' },
    });
  }

  // ==========================================
  // ACTIVITÉS À VENIR
  // ==========================================
  async getActivitesAVenir() {
    return this.prisma.vueActivitesAVenir.findMany({
      orderBy: { date: 'asc' },
    });
  }

  // ==========================================
  // RÉSUMÉ COMPLET DU DASHBOARD
  // ==========================================
  async getResume() {
    // 1. Statistiques des membres
    const totalMembres = await this.prisma.membre.count();
    const membresActifs = await this.prisma.membre.count({
      where: { statut: 'ACTIF' },
    });
    const membresSuspendus = await this.prisma.membre.count({
      where: { statut: 'SUSPENDU' },
    });
    const membresRadie = await this.prisma.membre.count({
      where: { statut: 'RADIE' },
    });

    // 2. Calculer le statut des cotisations pour tous les membres
    const membres = await this.prisma.membre.findMany({
      include: {
        cotisations: {
          include: { typeCotisation: true },
        },
      },
    });

    const now = new Date();
    const trimestreActuel = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) + 1;

    let membresAJour = 0;
    let membresEnRetard = 0;
    let totalMontantDu = 0;
    const membresEnRetardList: any[] = [];

    for (const membre of membres) {
      const dateAdhesion = new Date(membre.dateAdhesion);
      const trimestreAdhesion = dateAdhesion.getFullYear() * 4 + Math.floor(dateAdhesion.getMonth() / 3) + 1;
      const trimestresRequis = Math.max(0, trimestreActuel - trimestreAdhesion);

      const trimestresPayes = membre.cotisations.filter(
        c => c.statut === 'PAYEE' &&
            !c.typeCotisation.libelle.toLowerCase().includes('adhésion')
      ).length;

      const trimestresManquants = Math.max(0, trimestresRequis - trimestresPayes);
      const montantDu = trimestresManquants * 10000;

      if (trimestresManquants === 0) {
        membresAJour++;
      } else {
        membresEnRetard++;
        totalMontantDu += montantDu;
        
        membresEnRetardList.push({
          id: membre.id.toString(),
          nom: membre.nom,
          prenom: membre.prenom,
          matricule: membre.matricule,
          trimestresManquants,
          montantDu,
        });
      }
    }

    // Trier par montant dû décroissant et prendre les 10 premiers
    const top10EnRetard = membresEnRetardList
      .sort((a, b) => b.montantDu - a.montantDu)
      .slice(0, 10);

    // 3. Encaissements par mois (6 derniers mois)
    const sixMoisAvant = new Date();
    sixMoisAvant.setMonth(sixMoisAvant.getMonth() - 6);

    const cotisations = await this.prisma.cotisation.findMany({
      where: {
        statut: 'PAYEE',
        datePaiement: { gte: sixMoisAvant },
      },
      select: {
        montant: true,
        datePaiement: true,
      },
    });

    // Grouper par mois
    const encaissementsParMois: Record<string, number> = {};
    const moisLabels: string[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      moisLabels.push(date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
      encaissementsParMois[key] = 0;
    }

    for (const cot of cotisations) {
      const date = new Date(cot.datePaiement);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (encaissementsParMois[key] !== undefined) {
        encaissementsParMois[key] += Number(cot.montant);
      }
    }

    const encaissements = moisLabels.map((label, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        mois: label,
        montant: encaissementsParMois[key] || 0,
      };
    });

    // 4. Répartition des cotisations par type
    const typesCotisation = await this.prisma.typeCotisation.findMany({
      include: {
        cotisations: {
          where: { statut: 'PAYEE' },
          select: { id: true, montant: true },
        },
      },
    });

    const repartitionCotisations = typesCotisation.map(type => ({
      nom: type.libelle,
      total: type.cotisations.reduce((sum, c) => sum + Number(c.montant), 0),
      nombre: type.cotisations.length,
    }));

    return {
      // Stats membres
      totalMembres,
      membresActifs,
      membresSuspendus,
      membresRadie,
      
      // Stats cotisations
      membresAJour,
      membresEnRetard,
      totalMontantDu,
      
      // Graphiques
      top10EnRetard,
      encaissements,
      repartitionCotisations,
      
      // Meta
      dateGeneration: new Date(),
    };
  }
}