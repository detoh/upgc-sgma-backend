import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateursService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(organisationId: bigint | null, extraWhere: any = {}) {
    if (organisationId === null) return extraWhere;
    return { organisationId, ...extraWhere };
  }

  async create(organisationId: bigint, dto: CreateUtilisateurDto) {
    const existing = await this.prisma.utilisateur.findFirst({
      where: { email: dto.email, organisationId },
    });
    if (existing) throw new ConflictException('Cet email est déjà utilisé dans cette organisation');

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);
    const { motDePasse, ...userData } = dto;

    return this.prisma.utilisateur.create({
      data: { ...userData, motDePasse: hashedPassword, organisationId },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, actif: true, dateCreation: true },
    });
  }

  async findAll(organisationId: bigint | null) {
    return this.prisma.utilisateur.findMany({
      where: this.buildWhere(organisationId),
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, actif: true, dateCreation: true },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(organisationId: bigint | null, id: bigint) {
    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: this.buildWhere(organisationId, { id }),
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, actif: true, dateCreation: true, membres: true },
    });
    if (!utilisateur) throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé`);
    return utilisateur;
  }

  async update(organisationId: bigint | null, id: bigint, dto: UpdateUtilisateurDto) {
    await this.findOne(organisationId, id);
    return this.prisma.utilisateur.update({
      where: { id },
      data: dto,
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, actif: true, dateCreation: true },
    });
  }

  async toggleActif(organisationId: bigint | null, id: bigint) {
    const utilisateur = await this.findOne(organisationId, id);
    return this.prisma.utilisateur.update({
      where: { id },
      data: { actif: !utilisateur.actif },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });
  }

  async resetPassword(organisationId: bigint | null, id: bigint, nouveauMotDePasse: string) {
    await this.findOne(organisationId, id);
    if (nouveauMotDePasse.length < 6) throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
    return this.prisma.utilisateur.update({
      where: { id },
      data: { motDePasse: hashedPassword },
      select: { id: true, nom: true, prenom: true, email: true },
    });
  }

  async remove(organisationId: bigint | null, id: bigint) {
    await this.findOne(organisationId, id);
    return this.prisma.utilisateur.delete({ where: { id } });
  }
}