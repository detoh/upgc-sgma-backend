import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterOrganisationDto } from './dto/register-organisation.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  // Durée de l'essai gratuit (jours)
  private readonly DUREE_ESSAI = 14;

  constructor(private prisma: PrismaService) {}

  /**
   * Génère un slug unique à partir du nom de l'organisation
   */
  private async genererSlug(nom: string): Promise<string> {
    const base = nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // retire les accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40) || 'mutuelle';

    let slug = base;
    let compteur = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existant = await this.prisma.organisation.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existant) return slug;
      compteur += 1;
      slug = `${base}-${compteur}`;
    }
  }

  /**
   * Inscription publique : crée l'organisation + son ADMIN + l'essai gratuit
   */
  async register(dto: RegisterOrganisationDto) {
    const email = dto.email.trim().toLowerCase();

    // 1. Email déjà utilisé ?
const utilisateurExistant = await this.prisma.utilisateur.findFirst({
  where: { email },
  select: { id: true },
});

    if (utilisateurExistant) {
      throw new ConflictException(
        'Un compte existe déjà avec cet email. Connectez-vous ou utilisez un autre email.',
      );
    }

    // 2. Récupérer le plan d'essai (PREMIUM)
    const planEssai = await this.prisma.plan.findFirst({
      where: { type: 'PREMIUM', actif: true },
    });

    if (!planEssai) {
      this.logger.error('Plan PREMIUM introuvable : seed des plans non exécuté');
      throw new BadRequestException(
        'Inscription temporairement indisponible. Contactez le support.',
      );
    }

    // 3. Dates d'essai
    const now = new Date();
    const finEssai = new Date(now);
    finEssai.setDate(finEssai.getDate() + this.DUREE_ESSAI);

    // 4. Slug + hash du mot de passe
    const slug = await this.genererSlug(dto.nomOrganisation);
    const motDePasseHash = await bcrypt.hash(dto.motDePasse, 10);

    // 5. Transaction : organisation + admin + journal
    const resultat = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          nom: dto.nomOrganisation.trim(),
          slug,
          email,
          telephone: dto.telephoneOrganisation || dto.telephone,
          adresse: dto.adresse,
          devise: 'XOF',
          plan: 'PREMIUM',
          statutAbonnement: 'ACTIF',
          planId: planEssai.id,
          dateDebutEssai: now,
          dateFinEssai: finEssai,
          dateExpirationAbonnement: finEssai,
          actif: true,
        },
      });

      const utilisateur = await tx.utilisateur.create({
        data: {
          nom: dto.nom.trim(),
          prenom: dto.prenom.trim(),
          email,
          telephone: dto.telephone,
          motDePasse: motDePasseHash,
          role: 'ADMIN',
          actif: true,
          organisationId: organisation.id,
        },
      });

      await tx.journalEvenement.create({
        data: {
          organisationId: organisation.id,
          type: 'ORGANISATION_INSCRITE',
          description: `Inscription de "${organisation.nom}" - essai ${planEssai.nom} de ${this.DUREE_ESSAI} jours`,
          metadata: {
            slug,
            adminEmail: email,
            finEssai: finEssai.toISOString(),
          },
        },
      });

      return { organisation, utilisateur };
    });

    this.logger.log(
      `🎉 Nouvelle organisation : ${resultat.organisation.nom} (${slug}) - admin ${email}`,
    );

    return {
      message: `Compte créé avec succès. Votre essai gratuit de ${this.DUREE_ESSAI} jours est activé.`,
      organisation: {
        nom: resultat.organisation.nom,
        slug: resultat.organisation.slug,
      },
      admin: {
        email: resultat.utilisateur.email,
        role: resultat.utilisateur.role,
      },
      essai: {
        dureeJours: this.DUREE_ESSAI,
        dateFin: finEssai,
        plan: planEssai.nom,
      },
    };
  }
}