import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParametresDto } from './dto/update-parametres.dto';

@Injectable()
export class ParametresService {
  constructor(private prisma: PrismaService) {}

  async get() {
    // Récupérer les paramètres (il n'y en a qu'un seul avec ID = 1)
    let parametres = await this.prisma.parametre.findUnique({
      where: { id: 1 },
      include: {
        typeCotisationDefaut: true,
      },
    });

    // Si les paramètres n'existent pas encore, les créer avec des valeurs par défaut
    if (!parametres) {
      parametres = await this.prisma.parametre.create({
        data: {
          id: 1,
          nomMutuelle: 'UPGC Mutuelle',
          devise: 'XOF',
          joursGrace: 0,
          smtpConfig: {},
          paiementEnLigneConfig: {},
        },
        include: {
          typeCotisationDefaut: true,
        },
      });
    }

    return parametres;
  }

  async update(dto: UpdateParametresDto) {
    // S'assurer que les paramètres existent
    await this.get();

    return this.prisma.parametre.update({
      where: { id: 1 },
      data: {
        ...dto,
        typeCotisationDefautId: dto.typeCotisationDefautId 
          ? BigInt(dto.typeCotisationDefautId) 
          : undefined,
      },
      include: {
        typeCotisationDefaut: true,
      },
    });
  }
}