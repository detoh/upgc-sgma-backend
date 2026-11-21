import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  // Routes accessibles même si l'abonnement est suspendu/expiré
  private readonly routesAutorisees = [
    '/auth/profile',
    '/auth/logout',
    '/billing',
    '/billing/plans',
    '/billing/abonnements',
    '/billing/payer',
    '/billing/confirm',
  ];

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const url: string = request.url;

    // 1. Pas d'utilisateur → laisser passer (le JwtAuthGuard gère ça)
    if (!user) return true;

    // 2. SUPER_ADMIN → jamais bloqué (il gère toutes les organisations)
    if (user.role === 'SUPER_ADMIN') return true;

    // 3. Pas d'organisation associée → laisser passer
    if (!user.organisationId) return true;

    // 4. Route autorisée même si suspendu (pour pouvoir payer/renouveler)
    if (this.routesAutorisees.some((r) => url.startsWith(r))) {
      return true;
    }

    // 5. Vérifier le statut de l'abonnement en DB
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: BigInt(user.organisationId) },
      select: {
        statutAbonnement: true,
        dateExpirationAbonnement: true,
      },
    });

    if (!organisation) return true;

    const now = new Date();

    // 6. Bloquer si SUSPENDU
    if (organisation.statutAbonnement === 'SUSPENDU') {
      throw new ForbiddenException(
        'Votre abonnement est suspendu. Veuillez régulariser votre paiement pour continuer.',
      );
    }



    return true;
  }
}