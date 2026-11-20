import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RapportsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(organisationId: bigint | null, extraWhere: any = {}) {
    if (organisationId === null) return extraWhere;
    return { organisationId, ...extraWhere };

  }

  async getRapportFinancierAnnuel(organisationId: bigint | null, annee: number) {
    const dateDebut = new Date(`${annee}-01-01`);
    const dateFin = new Date(`${annee}-12-31`);
    const whereDate = { gte: dateDebut, lte: dateFin };

    const cotisations = await this.prisma.cotisation.findMany({
      where: { ...this.buildWhere(organisationId), datePaiement: whereDate },
      include: { typeCotisation: true, membre: { select: { id: true, matricule: true, nom: true, prenom: true } } },
    });

    const totalCotisationsPayees = cotisations.filter(c => c.statut === 'PAYEE').reduce((sum, c) => sum + Number(c.montant), 0);
    const totalCotisationsEnAttente = cotisations.filter(c => c.statut === 'EN_ATTENTE' || c.statut === 'EN_RETARD').reduce((sum, c) => sum + Number(c.montant), 0);

    const prestations = await this.prisma.prestation.findMany({
      where: { ...this.buildWhere(organisationId), dateEvenement: whereDate },
    });
    const totalPrestationsPayees = prestations.filter(p => p.statut === 'PAYEE').reduce((sum, p) => sum + Number(p.montant), 0);
    const totalPrestationsEnAttente = prestations.filter(p => p.statut === 'EN_ATTENTE' || p.statut === 'VALIDEE').reduce((sum, p) => sum + Number(p.montant), 0);

    const dons = await this.prisma.don.findMany({
      where: { ...this.buildWhere(organisationId), dateDon: whereDate },
    });
    const totalDons = dons.reduce((sum, d) => sum + Number(d.montant), 0);

    const totalMembres = await this.prisma.membre.count({ where: { ...this.buildWhere(organisationId), statut: 'ACTIF' } });
    const nouveauxMembres = await this.prisma.membre.count({ where: { ...this.buildWhere(organisationId), dateAdhesion: whereDate } });

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
      dons: { total: totalDons, nombre: dons.length },
      membres: { totalActifs: totalMembres, nouveaux: nouveauxMembres },
    };
  }

  async getRapportCotisations(organisationId: bigint | null, dateDebut: string, dateFin: string) {
    const cotisations = await this.prisma.cotisation.findMany({
      where: { ...this.buildWhere(organisationId), datePaiement: { gte: new Date(dateDebut), lte: new Date(dateFin) } },
      include: { membre: { select: { id: true, matricule: true, nom: true, prenom: true } }, typeCotisation: true },
      orderBy: { datePaiement: 'desc' },
    });

    const parStatut = {
      PAYEE: cotisations.filter(c => c.statut === 'PAYEE'),
      EN_ATTENTE: cotisations.filter(c => c.statut === 'EN_ATTENTE'),
      EN_RETARD: cotisations.filter(c => c.statut === 'EN_RETARD'),
      ANNULEE: cotisations.filter(c => c.statut === 'ANNULEE'),
    };

    const parModePaiement = cotisations.reduce((acc: any, c) => {
      if (c.modePaiement) acc[c.modePaiement] = (acc[c.modePaiement] || 0) + Number(c.montant);
      return acc;
    }, {});

    return {
      periode: { dateDebut, dateFin },
      total: cotisations.length,
      totalMontant: cotisations.reduce((sum, c) => sum + Number(c.montant), 0),
      parStatut: {
        PAYEE: { nombre: parStatut.PAYEE.length, montant: parStatut.PAYEE.reduce((sum, c) => sum + Number(c.montant), 0) },
        EN_ATTENTE: { nombre: parStatut.EN_ATTENTE.length, montant: parStatut.EN_ATTENTE.reduce((sum, c) => sum + Number(c.montant), 0) },
        EN_RETARD: { nombre: parStatut.EN_RETARD.length, montant: parStatut.EN_RETARD.reduce((sum, c) => sum + Number(c.montant), 0) },
      },
      parModePaiement,
      details: cotisations,
    };
  }

  async getRapportPrestations(organisationId: bigint | null, dateDebut: string, dateFin: string) {
    const prestations = await this.prisma.prestation.findMany({
      where: { ...this.buildWhere(organisationId), dateEvenement: { gte: new Date(dateDebut), lte: new Date(dateFin) } },
      include: { membre: { select: { id: true, matricule: true, nom: true, prenom: true } } },
      orderBy: { dateEvenement: 'desc' },
    });

    const parType = prestations.reduce((acc: any, p) => {
      if (!acc[p.typePrestation]) acc[p.typePrestation] = { nombre: 0, montant: 0 };
      acc[p.typePrestation].nombre++;
      acc[p.typePrestation].montant += Number(p.montant);
      return acc;
    }, {});

    return {
      periode: { dateDebut, dateFin },
      total: prestations.length,
      totalMontant: prestations.reduce((sum, p) => sum + Number(p.montant), 0),
      parType,
      parStatut: {
        EN_ATTENTE: prestations.filter(p => p.statut === 'EN_ATTENTE').length,
        VALIDEE: prestations.filter(p => p.statut === 'VALIDEE').length,
        REJETEE: prestations.filter(p => p.statut === 'REJETEE').length,
        PAYEE: prestations.filter(p => p.statut === 'PAYEE').length,
      },
      details: prestations,
    };
  }

  async getRapportDons(organisationId: bigint | null, dateDebut: string, dateFin: string) {
    const dons = await this.prisma.don.findMany({
      where: { ...this.buildWhere(organisationId), dateDon: { gte: new Date(dateDebut), lte: new Date(dateFin) } },
      include: { utilisateur: { select: { id: true, nom: true, prenom: true } } },
      orderBy: { dateDon: 'desc' },
    });

    return {
      periode: { dateDebut, dateFin },
      total: dons.length,
      totalMontant: dons.reduce((sum, d) => sum + Number(d.montant), 0),
      details: dons,
    };
  }

  async getRapportGeneralAG(organisationId: bigint | null, annee: number) {
    const rapportFinancier = await this.getRapportFinancierAnnuel(organisationId, annee);
    const parametres = await this.prisma.parametre.findFirst({ where: this.buildWhere(organisationId) });
    const activites = await this.prisma.activite.findMany({
      where: { ...this.buildWhere(organisationId), date: { gte: new Date(`${annee}-01-01`), lte: new Date(`${annee}-12-31`) } },
      orderBy: { date: 'asc' },
    });

    return {
      annee,
      mutuelle: { nom: parametres?.nomMutuelle || 'Mutuelle', devise: parametres?.devise || 'XOF' },
      rapportFinancier,
      activites,
      dateGeneration: new Date().toISOString(),
    };
  }

  async getEtatPaiements(organisationId: bigint | null, annee: number) {
    const membres = await this.prisma.membre.findMany({
      where: { ...this.buildWhere(organisationId), statut: 'ACTIF' },
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

    const parametres = await this.prisma.parametre.findFirst({ where: this.buildWhere(organisationId) });
    const getTrimestre = (mois: number): number => Math.ceil(mois / 3);
    const estEnCarence = (dateAdhesion: Date, dateReference: Date): boolean => {
      const joursGrace = parametres?.joursGrace ?? 90;
      const diffDays = (dateReference.getTime() - dateAdhesion.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays < joursGrace;
    };

    const dateReference = new Date();
    const etats = membres.map((membre, index) => {
      const paiements: Record<string, number> = {};
      membre.cotisations.forEach((cot) => {
        if (cot.statut === 'PAYEE' && cot.datePaiement) {
          const [anneePeriode, mois] = cot.periode.split('-').map(Number);
          const key = `${anneePeriode}-T${getTrimestre(mois)}`;
          paiements[key] = (paiements[key] || 0) + Number(cot.montant);
        }
      });

      let etat = 'Oui';
      if (estEnCarence(new Date(membre.dateAdhesion), dateReference)) {
        etat = 'Carence';
      } else if (Object.keys(paiements).filter(k => k.startsWith(`${annee}`)).length === 0) {
        etat = 'Non';
      }

      return { numero: index + 1, nom: membre.nom, prenoms: membre.prenom, matricule: membre.matricule, dateAdhesion: membre.dateAdhesion, paiements, etat };
    });

    const totaux: Record<string, number> = {};
    etats.forEach((e) => Object.entries(e.paiements).forEach(([key, montant]) => { totaux[key] = (totaux[key] || 0) + montant; }));

    return {
      annee,
      mutuelle: { nom: parametres?.nomMutuelle || 'Mutuelle', logoUrl: parametres?.logoUrl || '', adresse: parametres?.adresse || '', telephone: parametres?.telephone || '', email: parametres?.email || '', devise: parametres?.devise || 'XOF' },
      membres: etats,
      totaux,
      dateGeneration: new Date().toISOString(),
      nombreTotalMembres: membres.length,
      nombreAJour: etats.filter((e) => e.etat === 'Oui').length,
      nombreNonAJour: etats.filter((e) => e.etat === 'Non').length,
      nombreEnCarence: etats.filter((e) => e.etat === 'Carence').length,
      montantTotal: Object.values(totaux).reduce((sum, m) => sum + m, 
0),
    };
  }
}