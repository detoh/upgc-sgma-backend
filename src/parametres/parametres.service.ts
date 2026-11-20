import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParametresDto } from './dto/update-parametres.dto';

@Injectable()
export class ParametresService {
  constructor(private prisma: PrismaService) {}

  async get(organisationId: bigint) {
    let parametres = await this.prisma.parametre.findFirst({
      where: { organisationId },
      include: { typeCotisationDefaut: true },
    });

    if (!parametres) {
      parametres = await this.prisma.parametre.create({
        data: {
          organisationId,
          nomMutuelle: 'Ma Mutuelle',
          devise: 'XOF',
          joursGrace: 0,
          smtpConfig: {},
          paiementEnLigneConfig: {},
        },
        include: { typeCotisationDefaut: true },
      });
    }
    return parametres;
  }

  async update(organisationId: bigint, dto: UpdateParametresDto) {
    const existing = await this.get(organisationId);
    return this.prisma.parametre.update({
      where: { id: existing.id },
      data: {
        ...dto,
        typeCotisationDefautId: dto.typeCotisationDefautId ? BigInt(dto.typeCotisationDefautId) : undefined,
      },
      include: { typeCotisationDefaut: true },
    });
  }
}