import {
  Injectable, NotFoundException, BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrestationDto } from './dto/create-prestation.dto';
import { ValiderPrestationDto } from './dto/valider-prestation.dto';
import { PayerPrestationDto } from './dto/payer-prestation.dto';
import { QueryPrestationDto } from './dto/query-prestation.dto';
import { Prisma, StatutPrestation } from '@prisma/client';
import { NotificationsInAppService } from '../notifications-inapp/notifications-inapp.service';
import { TypeNotification } from '../notifications-inapp/dto/create-notification.dto';
import { EmailService } from '../common/email/email.service';
import { 
  templatePrestationValidee, 
  templatePrestationPayee, 
  templatePrestationRejetee 
} from '../common/email/templates/prestation.templates';

@Injectable()
export class PrestationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsInAppService: NotificationsInAppService,
    private emailService: EmailService,
  ) {}

  // ==========================================
  // HELPER : Ajouter une entrée à l'historique
  // ==========================================
  private ajouterHistorique(
    historiqueExistant: any,
    action: string,
    details: string,
    userId: bigint | null,
    userName?: string,
  ): any[] {
    const historique = Array.isArray(historiqueExistant) ? historiqueExistant : [];
    historique.push({
      date: new Date().toISOString(),
      action,
      details,
      userId: userId ? userId.toString() : null,
      userName: userName || 'Système',
    });
    return historique;
  }

  // ==========================================
  // HELPER : Envoyer email au membre
  // ==========================================
  private async envoyerEmailAuMembre(
    membreId: bigint,
    typePrestation: string,
    montant: number,
    action: 'VALIDEE' | 'REJETEE' | 'PAYEE',
    options?: { motif?: string; modePaiement?: string; reference?: string },
  ): Promise<void> {
    try {
      const membreComplet = await this.prisma.membre.findUnique({
        where: { id: membreId },
        select: { email: true, prenom: true, nom: true },
      });

      if (!membreComplet?.email) {
        console.log('ℹ️ Membre sans email, notification in-app uniquement');
        return;
      }

      let html = '';
      let subject = '';

      if (action === 'VALIDEE') {
        html = templatePrestationValidee({
          membrePrenom: membreComplet.prenom,
          membreNom: membreComplet.nom,
          typePrestation,
          montant,
        });
        subject = '✅ Votre prestation a été validée - UPGC Mutuelle';
      } else if (action === 'REJETEE') {
        html = templatePrestationRejetee({
          membrePrenom: membreComplet.prenom,
          membreNom: membreComplet.nom,
          typePrestation,
          motif: options?.motif,
        });
        subject = '❌ Votre prestation a été rejetée - UPGC Mutuelle';
      } else if (action === 'PAYEE') {
        html = templatePrestationPayee({
          membrePrenom: membreComplet.prenom,
          membreNom: membreComplet.nom,
          typePrestation,
          montant,
          modePaiement: options?.modePaiement || 'Non spécifié',
          reference: options?.reference,
        });
        subject = '💰 Votre prestation a été payée - UPGC Mutuelle';
      }

      await this.emailService.sendEmail({
        to: membreComplet.email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  }

  // ==========================================
  // CRÉATION D'UNE DEMANDE DE PRESTATION
  // ==========================================
  async create(dto: CreatePrestationDto, userId: bigint) {
    // Vérifier que le membre existe ET est actif
    const membre = await this.prisma.membre.findUnique({
      where: { id: BigInt(dto.membreId) },
    });
    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${dto.membreId} non trouvé`);
    }

    if (membre.statut !== 'ACTIF') {
      throw new BadRequestException(
        `Ce membre n'est pas actif (statut: ${membre.statut}). Seuls les membres actifs peuvent bénéficier de prestations.`,
      );
    }

    // Vérifier si le membre est à jour de ses cotisations
    const cotisationsEnAttente = await this.prisma.cotisation.count({
      where: {
        membreId: BigInt(dto.membreId),
        statut: { in: ['EN_ATTENTE', 'EN_RETARD'] },
      },
    });

    if (cotisationsEnAttente > 0) {
      throw new BadRequestException(
        `Ce membre n'est pas à jour de ses cotisations (${cotisationsEnAttente} cotisation(s) impayée(s)). Il doit régulariser sa situation avant de bénéficier d'une prestation.`,
      );
    }

    // Vérifier le bénéficiaire si fourni
    if (dto.beneficiaireId) {
      const beneficiaire = await this.prisma.membreFamille.findUnique({
        where: { id: BigInt(dto.beneficiaireId) },
      });
      if (!beneficiaire) {
        throw new NotFoundException(`Bénéficiaire avec ID ${dto.beneficiaireId} non trouvé`);
      }
      if (beneficiaire.membreId !== BigInt(dto.membreId)) {
        throw new BadRequestException('Ce bénéficiaire n\'appartient pas à ce membre');
      }
    }

    // Récupérer l'utilisateur qui crée la demande
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    // Créer l'historique initial
    const historiqueInitial = this.ajouterHistorique(
      [],
      'CREATION',
      `Demande créée (${dto.typePrestation} - ${Number(dto.montant).toLocaleString()} XOF)`,
      userId,
      utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Système',
    );

    // Créer la prestation
    const prestationCreee = await this.prisma.prestation.create({
      data: {
        membreId: BigInt(dto.membreId),
        beneficiaireId: dto.beneficiaireId ? BigInt(dto.beneficiaireId) : undefined,
        typePrestation: dto.typePrestation,
        dateEvenement: new Date(dto.dateEvenement),
        description: dto.description,
        montant: dto.montant,
        statut: 'EN_ATTENTE',
        historique: historiqueInitial,
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
        beneficiaire: true,
      },
    });

    // Notifier les admins et gestionnaires (in-app)
    try {
      const adminsEtGestionnaires = await this.prisma.utilisateur.findMany({
        where: { role: { in: ['ADMIN', 'GESTIONNAIRE'] } },
        select: { id: true },
      });

      await this.notificationsInAppService.createForMultipleUsers(
        adminsEtGestionnaires.map(u => Number(u.id)),
        'Nouvelle demande de prestation',
        `${membre.prenom} ${membre.nom} a soumis une demande de ${dto.typePrestation} (${Number(dto.montant).toLocaleString()} XOF)`,
        TypeNotification.INFO,
        '/dashboard/prestations',
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications:', error);
    }

    return prestationCreee;
  }

  // ==========================================
  // LISTE DES PRESTATIONS (avec filtres)
  // ==========================================
  async findAll(query: QueryPrestationDto) {
    const { page = 1, limit = 10, membreId, statut, typePrestation } = query;
    const skip = (page - 1) * limit;
    const take = Number(limit);

    const where: Prisma.PrestationWhereInput = {};

    if (membreId) {
      where.membreId = BigInt(membreId);
    }
    if (statut) {
      where.statut = statut;
    }
    if (typePrestation) {
      where.typePrestation = typePrestation;
    }

    const [prestations, total] = await Promise.all([
      this.prisma.prestation.findMany({
        where,
        skip,
        take,
        orderBy: { dateEvenement: 'desc' },
        include: {
          membre: {
            select: { id: true, matricule: true, nom: true, prenom: true },
          },
          beneficiaire: true,
        },
      }),
      this.prisma.prestation.count({ where }),
    ]);

    return {
      data: prestations,
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: bigint) {
    const prestation = await this.prisma.prestation.findUnique({
      where: { id },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
        beneficiaire: true,
        validePar: {
          select: { id: true, nom: true, prenom: true },
        },
        payePar: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });

    if (!prestation) {
      throw new NotFoundException(`Prestation avec ID ${id} non trouvée`);
    }

    return prestation;
  }

  // ==========================================
  // VALIDATION OU REJET D'UNE PRESTATION
  // ==========================================
  async valider(id: bigint, dto: ValiderPrestationDto, valideParId: bigint) {
    const prestation = await this.findOne(id);

    if (prestation.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        `Impossible de valider une prestation avec le statut ${prestation.statut}`,
      );
    }

    const nouveauStatut: StatutPrestation = dto.valider ? 'VALIDEE' : 'REJETEE';

    // Récupérer l'utilisateur qui valide
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: valideParId },
    });

    // Ajouter à l'historique
    const historiqueMAJ = this.ajouterHistorique(
      (prestation as any).historique || [],
      dto.valider ? 'VALIDATION' : 'REJET',
      dto.motif || (dto.valider ? 'Demande validée' : 'Demande rejetée'),
      valideParId,
      utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Système',
    );

    const prestationMAJ = await this.prisma.prestation.update({
      where: { id },
      data: {
        statut: nouveauStatut,
        dateValidation: new Date(),
        valideParId,
        historique: historiqueMAJ,
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });

    // 🔔 Notification in-app au créateur de la prestation
    try {
      const premiereEntreeHistorique = Array.isArray((prestation as any).historique) && (prestation as any).historique.length > 0
        ? (prestation as any).historique[0]
        : null;

      if (premiereEntreeHistorique?.userId) {
        await this.notificationsInAppService.create({
          userId: parseInt(premiereEntreeHistorique.userId),
          titre: dto.valider ? 'Prestation validée ✅' : 'Prestation rejetée ❌',
          message: dto.valider
            ? `Votre demande de ${prestation.typePrestation} a été validée.`
            : `Votre demande a été rejetée. Motif : ${dto.motif || 'Non spécifié'}`,
          type: dto.valider ? TypeNotification.SUCCESS : TypeNotification.ERROR,
          lien: '/dashboard/prestations',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification in-app:', error);
    }

    // 📧 NOUVEAU : Email au membre
    await this.envoyerEmailAuMembre(
      prestation.membreId,
      prestation.typePrestation,
      Number(prestation.montant),
      dto.valider ? 'VALIDEE' : 'REJETEE',
      { motif: dto.motif },
    );

    return prestationMAJ;
  }

  // ==========================================
  // PAIEMENT D'UNE PRESTATION VALIDÉE
  // ==========================================
  async payer(id: bigint, dto: PayerPrestationDto, payeParId: bigint) {
    const prestation = await this.findOne(id);

    if (prestation.statut !== 'VALIDEE') {
      throw new BadRequestException(
        `Impossible de payer une prestation avec le statut ${prestation.statut}. Elle doit être VALIDÉE d'abord.`,
      );
    }

    // Récupérer l'utilisateur qui paie
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: payeParId },
    });

    // Ajouter à l'historique
    const historiqueMAJ = this.ajouterHistorique(
      (prestation as any).historique || [],
      'PAIEMENT',
      `Payée par ${dto.modePaiement}${dto.reference ? ` (réf: ${dto.reference})` : ''}`,
      payeParId,
      utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Système',
    );

    const prestationMAJ = await this.prisma.prestation.update({
      where: { id },
      data: {
        statut: 'PAYEE',
        datePaiement: dto.datePaiement ? new Date(dto.datePaiement) : new Date(),
        modePaiement: dto.modePaiement,
        reference: dto.reference,
        payeParId,
        historique: historiqueMAJ,
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });

    // 🔔 Notification in-app au créateur
    try {
      const premiereEntreeHistorique = Array.isArray((prestation as any).historique) && (prestation as any).historique.length > 0
        ? (prestation as any).historique[0]
        : null;

      if (premiereEntreeHistorique?.userId) {
        await this.notificationsInAppService.create({
          userId: parseInt(premiereEntreeHistorique.userId),
          titre: 'Prestation payée 💰',
          message: `Votre prestation de ${Number(prestation.montant).toLocaleString()} XOF a été payée par ${dto.modePaiement}.`,
          type: TypeNotification.SUCCESS,
          lien: '/dashboard/prestations',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification in-app:', error);
    }

    // 📧 NOUVEAU : Email au membre
    await this.envoyerEmailAuMembre(
      prestation.membreId,
      prestation.typePrestation,
      Number(prestation.montant),
      'PAYEE',
      { modePaiement: dto.modePaiement, reference: dto.reference },
    );

    return prestationMAJ;
  }

  // ==========================================
  // STATISTIQUES
  // ==========================================
  async getStats() {
    const [enAttente, validees, rejetees, payees] = await Promise.all([
      this.prisma.prestation.count({ where: { statut: 'EN_ATTENTE' } }),
      this.prisma.prestation.count({ where: { statut: 'VALIDEE' } }),
      this.prisma.prestation.count({ where: { statut: 'REJETEE' } }),
      this.prisma.prestation.count({ where: { statut: 'PAYEE' } }),
    ]);

    const [montantAttente, montantValidees, montantPayees] = await Promise.all([
      this.prisma.prestation.aggregate({
        where: { statut: 'EN_ATTENTE' },
        _sum: { montant: true },
      }),
      this.prisma.prestation.aggregate({
        where: { statut: 'VALIDEE' },
        _sum: { montant: true },
      }),
      this.prisma.prestation.aggregate({
        where: { statut: 'PAYEE' },
        _sum: { montant: true },
      }),
    ]);

    return {
      enAttente,
      validees,
      rejetees,
      payees,
      total: enAttente + validees + rejetees + payees,
      montantAttente: montantAttente._sum.montant || 0,
      montantValidees: montantValidees._sum.montant || 0,
      montantPayees: montantPayees._sum.montant || 0,
    };
  }
}