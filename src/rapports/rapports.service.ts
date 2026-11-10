import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RapportsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // RAPPORT FINANCIER ANNUEL (pour AG)
  // ==========================================
  async getRapportFinancierAnnuel(annee: number) {
    const dateDebut = new Date(`${annee}-01-01`);
    const dateFin = new Date(`${annee}-12-31`);

    // Cotisations
    const cotisations = await this.prisma.cotisation.findMany({
      where: {
        datePaiement: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
      include: {
        typeCotisation: true,
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });

    const totalCotisationsPayees = cotisations
      .filter(c => c.statut === 'PAYEE')
      .reduce((sum, c) => sum + Number(c.montant), 0);

    const totalCotisationsEnAttente = cotisations
      .filter(c => c.statut === 'EN_ATTENTE' || c.statut === 'EN_RETARD')
      .reduce((sum, c) => sum + Number(c.montant), 0);

    // Prestations
    const prestations = await this.prisma.prestation.findMany({
      where: {
        dateEvenement: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
    });

    const totalPrestationsPayees = prestations
      .filter(p => p.statut === 'PAYEE')
      .reduce((sum, p) => sum + Number(p.montant), 0);

    const totalPrestationsEnAttente = prestations
      .filter(p => p.statut === 'EN_ATTENTE' || p.statut === 'VALIDEE')
      .reduce((sum, p) => sum + Number(p.montant), 0);

    // Dons
    const dons = await this.prisma.don.findMany({
      where: {
        dateDon: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
    });

    const totalDons = dons.reduce((sum, d) => sum + Number(d.montant), 0);

    // Membres
    const totalMembres = await this.prisma.membre.count({
      where: { statut: 'ACTIF' },
    });

    const nouveauxMembres = await this.prisma.membre.count({
      where: {
        dateAdhesion: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
    });

    return {
      annee,
      resume: {
        totalRecettes: totalCotisationsPayees + totalDons,
        totalDepenses: totalPrestationsPayees,
        solde: (totalCotisationsPayees + totalDons) - totalPrestationsPayees,
      },
      cotisations: {
        totalPayees: totalCotisationsPayees,
        totalEnAttente: totalCotisationsEnAttente,
        nombre: cotisations.length,
        nombrePayees: cotisations.filter(c => c.statut === 'PAYEE').length,
      },
      prestations: {
        totalPayees: totalPrestationsPayees,
        totalEnAttente: totalPrestationsEnAttente,
        nombre: prestations.length,
        nombrePayees: prestations.filter(p => p.statut === 'PAYEE').length,
      },
      dons: {
        total: totalDons,
        nombre: dons.length,
      },
      membres: {
        totalActifs: totalMembres,
        nouveaux: nouveauxMembres,
      },
    };
  }

  // ==========================================
  // RAPPORT DES COTISATIONS PAR PÉRIODE
  // ==========================================
  async getRapportCotisations(dateDebut: string, dateFin: string) {
    const cotisations = await this.prisma.cotisation.findMany({
      where: {
        datePaiement: {
          gte: new Date(dateDebut),
          lte: new Date(dateFin),
        },
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
        typeCotisation: true,
      },
      orderBy: { datePaiement: 'desc' },
    });

    const parStatut = {
      PAYEE: cotisations.filter(c => c.statut === 'PAYEE'),
      EN_ATTENTE: cotisations.filter(c => c.statut === 'EN_ATTENTE'),
      EN_RETARD: cotisations.filter(c => c.statut === 'EN_RETARD'),
      ANNULEE: cotisations.filter(c => c.statut === 'ANNULEE'),
    };

    const parModePaiement = cotisations.reduce((acc: any, c) => {
      if (c.modePaiement) {
        acc[c.modePaiement] = (acc[c.modePaiement] || 0) + Number(c.montant);
      }
      return acc;
    }, {});

    return {
      periode: { dateDebut, dateFin },
      total: cotisations.length,
      totalMontant: cotisations.reduce((sum, c) => sum + Number(c.montant), 0),
      parStatut: {
        PAYEE: {
          nombre: parStatut.PAYEE.length,
          montant: parStatut.PAYEE.reduce((sum, c) => sum + Number(c.montant), 0),
        },
        EN_ATTENTE: {
          nombre: parStatut.EN_ATTENTE.length,
          montant: parStatut.EN_ATTENTE.reduce((sum, c) => sum + Number(c.montant), 0),
        },
        EN_RETARD: {
          nombre: parStatut.EN_RETARD.length,
          montant: parStatut.EN_RETARD.reduce((sum, c) => sum + Number(c.montant), 0),
        },
      },
      parModePaiement,
      details: cotisations,
    };
  }

  // ==========================================
  // RAPPORT DES PRESTATIONS PAR TYPE
  // ==========================================
  async getRapportPrestations(dateDebut: string, dateFin: string) {
    const prestations = await this.prisma.prestation.findMany({
      where: {
        dateEvenement: {
          gte: new Date(dateDebut),
          lte: new Date(dateFin),
        },
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
      orderBy: { dateEvenement: 'desc' },
    });

    const parType = prestations.reduce((acc: any, p) => {
      if (!acc[p.typePrestation]) {
        acc[p.typePrestation] = { nombre: 0, montant: 0 };
      }
      acc[p.typePrestation].nombre++;
      acc[p.typePrestation].montant += Number(p.montant);
      return acc;
    }, {});

    const parStatut = {
      EN_ATTENTE: prestations.filter(p => p.statut === 'EN_ATTENTE').length,
      VALIDEE: prestations.filter(p => p.statut === 'VALIDEE').length,
      REJETEE: prestations.filter(p => p.statut === 'REJETEE').length,
      PAYEE: prestations.filter(p => p.statut === 'PAYEE').length,
    };

    return {
      periode: { dateDebut, dateFin },
      total: prestations.length,
      totalMontant: prestations.reduce((sum, p) => sum + Number(p.montant), 0),
      parType,
      parStatut,
      details: prestations,
    };
  }

  // ==========================================
  // RAPPORT DES DONS
  // ==========================================
  async getRapportDons(dateDebut: string, dateFin: string) {
    const dons = await this.prisma.don.findMany({
      where: {
        dateDon: {
          gte: new Date(dateDebut),
          lte: new Date(dateFin),
        },
      },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
      orderBy: { dateDon: 'desc' },
    });

    return {
      periode: { dateDebut, dateFin },
      total: dons.length,
      totalMontant: dons.reduce((sum, d) => sum + Number(d.montant), 0),
      details: dons,
    };
  }

  // ==========================================
  // RAPPORT GÉNÉRAL POUR AG
  // ==========================================
  async getRapportGeneralAG(annee: number) {
    const rapportFinancier = await this.getRapportFinancierAnnuel(annee);
    
    const parametres = await this.prisma.parametre.findUnique({
      where: { id: 1 },
    });

    const activités = await this.prisma.activite.findMany({
      where: {
        date: {
          gte: new Date(`${annee}-01-01`),
          lte: new Date(`${annee}-12-31`),
        },
      },
      orderBy: { date: 'asc' },
    });

    return {
      annee,
      mutuelle: {
        nom: parametres?.nomMutuelle || 'UPGC Mutuelle',
        devise: parametres?.devise || 'XOF',
      },
      rapportFinancier,
      activites: activités,
      dateGeneration: new Date().toISOString(),
    };
  }
  // ==========================================
// ÉTAT DES PAIEMENTS PAR TRIMESTRE (Format AG)
// ==========================================
async getEtatPaiements(annee: number) {
  // Récupérer tous les membres actifs
  const membres = await this.prisma.membre.findMany({
    where: { statut: 'ACTIF' },
    orderBy: { nom: 'asc' },
    include: {
      cotisations: {
        where: {
          OR: [
            { periode: { startsWith: `${annee - 1}` } },
            { periode: { startsWith: `${annee}` } },
            { periode: { startsWith: `${annee + 1}` } },
          ],
        },
      },
    },
  });

  const parametres = await this.prisma.parametre.findUnique({
    where: { id: 1 },
  });

  // Fonction pour déterminer le trimestre d'un mois
  const getTrimestre = (mois: number): number => {
    return Math.ceil(mois / 3); // 1-3 → T1, 4-6 → T2, 7-9 → T3, 10-12 → T4
  };

  // Fonction pour vérifier si un membre est en carence
  const estEnCarence = (dateAdhesion: Date, dateReference: Date): boolean => {
    const joursGrace = parametres?.joursGrace ?? 90; // Par défaut 90 jours
    const diffTime = dateReference.getTime() - dateAdhesion.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays < joursGrace;
  };

  const dateReference = new Date();

  const etats = membres.map((membre, index) => {
    // Organiser les cotisations par trimestre
    const paiements: Record<string, number> = {};

    membre.cotisations.forEach((cot) => {
      if (cot.statut === 'PAYEE' && cot.datePaiement) {
        const [anneePeriode, mois] = cot.periode.split('-').map(Number);
        const trimestre = getTrimestre(mois);
        const key = `${anneePeriode}-T${trimestre}`;
        paiements[key] = (paiements[key] || 0) + Number(cot.montant);
      }
    });

    // Déterminer l'état du membre
    let etat = 'Oui';
    const dateAdhesion = new Date(membre.dateAdhesion);

    if (estEnCarence(dateAdhesion, dateReference)) {
      etat = 'Carence';
    } else {
      // Vérifier si à jour pour l'année en cours (au moins 1 paiement cette année)
      const paiementsAnneeCourante = Object.keys(paiements).filter(
        (k) => k.startsWith(`${annee}`),
      );
      if (paiementsAnneeCourante.length === 0) {
        etat = 'Non';
      }
    }

    return {
      numero: index + 1,
      nom: membre.nom,
      prenoms: membre.prenom,
      matricule: membre.matricule,
      dateAdhesion: membre.dateAdhesion,
      paiements,
      etat,
    };
  });

  // Calculer les totaux par trimestre
  const totaux: Record<string, number> = {};
  etats.forEach((e) => {
    Object.entries(e.paiements).forEach(([key, montant]) => {
      totaux[key] = (totaux[key] || 0) + montant;
    });
  });

  return {
    annee,
    mutuelle: {
      nom: parametres?.nomMutuelle || 'UPGC Mutuelle',
      logoUrl: parametres?.logoUrl || '',
      adresse: parametres?.adresse || '',
      telephone: parametres?.telephone || '',
      email: parametres?.email || '',
      devise: parametres?.devise || 'XOF',
    },
    membres: etats,
    totaux,
    dateGeneration: new Date().toISOString(),
    nombreTotalMembres: membres.length,
    nombreAJour: etats.filter((e) => e.etat === 'Oui').length,
    nombreNonAJour: etats.filter((e) => e.etat === 'Non').length,
    nombreEnCarence: etats.filter((e) => e.etat === 'Carence').length,
    montantTotal: Object.values(totaux).reduce((sum, m) => sum + m, 0),
  };
}
}