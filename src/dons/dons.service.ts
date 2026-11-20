import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonDto } from './dto/create-don.dto';

@Injectable()
export class DonsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(organisationId: bigint | null, extraWhere: any = {}) {
    if (organisationId === null) return extraWhere;
    return { organisationId, ...extraWhere };
  }

  async create(organisationId: bigint, dto: CreateDonDto, userId: bigint) {
    return this.prisma.don.create({
      data: {
        structureDonatrice: dto.structureDonatrice,
        montant: dto.montant,
        dateDon: dto.dateDon ? new Date(dto.dateDon) : new Date(),
        modePaiement: dto.modePaiement,
        motif: dto.motif,
        reference: dto.reference,
        utilisateurId: userId,
        organisationId, // 🆕
      },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });
  }

  async findAll(organisationId: bigint | null) {
    return this.prisma.don.findMany({
      where: this.buildWhere(organisationId),
      orderBy: { dateDon: 'desc' },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });
  }

  async getStats(organisationId: bigint | null) {
    // Optimisation : on ne récupère que le montant pour le calcul
    const dons = await this.prisma.don.findMany({
      where: this.buildWhere(organisationId),
      select: { montant: true },
    });

    const total = dons.reduce((sum, don) => sum + Number(don.montant), 0);

    return {
      totalDons: dons.length,
      montantTotal: total,
    };
  }
}