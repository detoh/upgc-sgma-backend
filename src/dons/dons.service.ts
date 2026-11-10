import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonDto } from './dto/create-don.dto';

@Injectable()
export class DonsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDonDto, userId: bigint) {
    return this.prisma.don.create({
      data: {
        structureDonatrice: dto.structureDonatrice,
        montant: dto.montant,
        dateDon: dto.dateDon ? new Date(dto.dateDon) : new Date(),
        modePaiement: dto.modePaiement,
        motif: dto.motif,
        reference: dto.reference,
        utilisateurId: userId,
      },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.don.findMany({
      orderBy: { dateDon: 'desc' },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });
  }

  async getStats() {
    const dons = await this.prisma.don.findMany();
    
    const total = dons.reduce((sum, don) => sum + Number(don.montant), 0);
    
    return {
      totalDons: dons.length,
      montantTotal: total,
    };
  }
}