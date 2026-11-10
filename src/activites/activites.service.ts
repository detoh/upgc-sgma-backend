import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActiviteDto } from './dto/create-activite.dto';
import { UpdateActiviteDto } from './dto/update-activite.dto';

@Injectable()
export class ActivitesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateActiviteDto) {
    return this.prisma.activite.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        lieu: dto.lieu,
        date: new Date(dto.date),
        budget: dto.budget,
        responsable: dto.responsable,
      },
    });
  }

  async findAll() {
    return this.prisma.activite.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: bigint) {
    const activite = await this.prisma.activite.findUnique({
      where: { id },
    });

    if (!activite) {
      throw new NotFoundException(`Activité avec ID ${id} non trouvée`);
    }

    return activite;
  }

  async update(id: bigint, dto: UpdateActiviteDto) {
    await this.findOne(id);

    return this.prisma.activite.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);

    return this.prisma.activite.delete({
      where: { id },
    });
  }
}