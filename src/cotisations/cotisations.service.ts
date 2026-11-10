import { 
  Injectable, NotFoundException, ConflictException, BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTypeCotisationDto } from './dto/create-type-cotisation.dto';
import { CreateCotisationDto } from './dto/create-cotisation.dto';
import { UpdateCotisationDto } from './dto/update-cotisation.dto';
import { PayerCotisationDto } from './dto/payer-cotisation.dto';
import { QueryCotisationDto } from './dto/query-cotisation.dto';
import { Prisma, StatutCotisation } from '@prisma/client';

@Injectable()
export class CotisationsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // TYPES DE COTISATION
  // ==========================================
  async createType(dto: CreateTypeCotisationDto) {
    // Vérifier si le libellé existe déjà
    const existing = await this.prisma.typeCotisation.findUnique({
      where: { libelle: dto.libelle },
    });

    if (existing) {
      throw new ConflictException('Ce type de cotisation existe déjà');
    }

    return this.prisma.typeCotisation.create({
      data: { libelle: dto.libelle },
    });
  }

  async findAllTypes() {
    return this.prisma.typeCotisation.findMany({
      orderBy: { libelle: 'asc' },
      include: {
        _count: {
          select: { cotisations: true },
        },
      },
    });
  }

  // ==========================================
  // COTISATIONS
  // ==========================================
  async create(dto: CreateCotisationDto) {
    // Vérifier que le membre existe
    const membre = await this.prisma.membre.findUnique({
      where: { id: BigInt(dto.membreId) },
    });
    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${dto.membreId} non trouvé`);
    }

    // Vérifier que le type de cotisation existe
    const type = await this.prisma.typeCotisation.findUnique({
      where: { id: BigInt(dto.typeCotisationId) },
    });
    if (!type) {
      throw new NotFoundException(`Type de cotisation avec ID ${dto.typeCotisationId} non trouvé`);
    }

    // Vérifier l'unicité (membre + type + période)
    const existing = await this.prisma.cotisation.findUnique({
      where: {
        membreId_typeCotisationId_periode: {
          membreId: BigInt(dto.membreId),
          typeCotisationId: BigInt(dto.typeCotisationId),
          periode: dto.periode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Une cotisation existe déjà pour ce membre, ce type et cette période (${dto.periode})`,
      );
    }

    return this.prisma.cotisation.create({
      data: {
        membreId: BigInt(dto.membreId),
        typeCotisationId: BigInt(dto.typeCotisationId),
        montant: dto.montant,
        periode: dto.periode,
        statut: dto.statut || 'EN_ATTENTE',
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
        typeCotisation: true,
      },
    });
  }

  async findAll(query: QueryCotisationDto) {
    const { page = 1, limit = 10, membreId, periode, statut, typeCotisationId } = query;
    const skip = (page - 1) * limit;
    const take = Number(limit);

    const where: Prisma.CotisationWhereInput = {};

    if (membreId) {
      where.membreId = BigInt(membreId);
    }

    if (periode) {
      where.periode = periode;
    }

    if (statut) {
      where.statut = statut;
    }

    if (typeCotisationId) {
      where.typeCotisationId = BigInt(typeCotisationId);
    }

    const [cotisations, total] = await Promise.all([
      this.prisma.cotisation.findMany({
        where,
        skip,
        take,
        orderBy: { periode: 'desc' },
        include: {
          membre: {
            select: { id: true, matricule: true, nom: true, prenom: true },
          },
          typeCotisation: true,
        },
      }),
      this.prisma.cotisation.count({ where }),
    ]);

    return {
      data: cotisations,
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: bigint) {
    const cotisation = await this.prisma.cotisation.findUnique({
      where: { id },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
        typeCotisation: true,
      },
    });

    if (!cotisation) {
      throw new NotFoundException(`Cotisation avec ID ${id} non trouvée`);
    }

    return cotisation;
  }

  // ==========================================
  // PAIEMENT D'UNE COTISATION
  // ==========================================
  async payer(id: bigint, dto: PayerCotisationDto) {
    const cotisation = await this.findOne(id);

    if (cotisation.statut === 'PAYEE') {
      throw new BadRequestException('Cette cotisation est déjà payée');
    }

    if (cotisation.statut === 'ANNULEE') {
      throw new BadRequestException('Impossible de payer une cotisation annulée');
    }

    return this.prisma.cotisation.update({
      where: { id },
      data: {
        statut: 'PAYEE',
        modePaiement: dto.modePaiement,
        reference: dto.reference,
        datePaiement: dto.datePaiement ? new Date(dto.datePaiement) : new Date(),
      },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
        typeCotisation: true,
      },
    });
  }

  // ==========================================
  // ANNULATION D'UNE COTISATION
  // ==========================================
  async annuler(id: bigint) {
    const cotisation = await this.findOne(id);

    if (cotisation.statut === 'PAYEE') {
      throw new BadRequestException('Impossible d\'annuler une cotisation déjà payée');
    }

    return this.prisma.cotisation.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  // ==========================================
  // STATISTIQUES PAR MEMBRE
  // ==========================================
  async getStatsByMembre(membreId: bigint) {
    const cotisations = await this.prisma.cotisation.findMany({
      where: { membreId },
      include: { typeCotisation: true },
    });

    const totalPaye = cotisations
      .filter(c => c.statut === 'PAYEE')
      .reduce((sum, c) => sum + Number(c.montant), 0);

    const totalEnAttente = cotisations
      .filter(c => c.statut === 'EN_ATTENTE' || c.statut === 'EN_RETARD')
      .reduce((sum, c) => sum + Number(c.montant), 0);

    return {
      membreId: membreId.toString(),
      totalCotisations: cotisations.length,
      totalPaye,
      totalEnAttente,
      nombrePayees: cotisations.filter(c => c.statut === 'PAYEE').length,
      nombreEnAttente: cotisations.filter(c => c.statut === 'EN_ATTENTE').length,
      nombreEnRetard: cotisations.filter(c => c.statut === 'EN_RETARD').length,
    };
  }
}