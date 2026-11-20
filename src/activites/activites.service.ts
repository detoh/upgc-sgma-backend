import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActiviteDto } from './dto/create-activite.dto';
import { UpdateActiviteDto } from './dto/update-activite.dto';

@Injectable()
export class ActivitesService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(organisationId: bigint | null, extraWhere: any = {}) {
    if (organisationId === null) return extraWhere;
    return { organisationId, ...extraWhere };
  }

  async create(organisationId: bigint, dto: CreateActiviteDto) {
    return this.prisma.activite.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        lieu: dto.lieu,
        date: new Date(dto.date),
        budget: dto.budget,
        responsable: dto.responsable,
        organisationId, // 🆕
      },
    });
  }

  async findAll(organisationId: bigint | null) {
    return this.prisma.activite.findMany({
      where: this.buildWhere(organisationId),
      orderBy: { date: 'asc' },
    });
  }

  async findOne(organisationId: bigint | null, id: bigint) {
    const activite = await this.prisma.activite.findFirst({
      where: this.buildWhere(organisationId, { id }),
    });

    if (!activite) {
      throw new NotFoundException(`Activité avec ID ${id} non trouvée`);
    }

    return activite;
  }

  async update(organisationId: bigint | null, id: bigint, dto: UpdateActiviteDto) {
    await this.findOne(organisationId, id);

    return this.prisma.activite.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(organisationId: bigint | null, id: bigint) {
    await this.findOne(organisationId, id);

    return this.prisma.activite.delete({
      where: { id },
    });
  }
}