import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateursService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUtilisateurDto) {
    // Vérifier si l'email existe déjà
    const existing = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);

    const { motDePasse, ...userData } = dto;

    return this.prisma.utilisateur.create({
      data: {
        ...userData,
        motDePasse: hashedPassword,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        dateCreation: true,
      },
    });
  }

  async findAll() {
    return this.prisma.utilisateur.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        dateCreation: true,
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        dateCreation: true,
        membres: true,
      },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé`);
    }

    return utilisateur;
  }

  async update(id: bigint, dto: UpdateUtilisateurDto) {
    await this.findOne(id);

    return this.prisma.utilisateur.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        dateCreation: true,
      },
    });
  }

  async toggleActif(id: bigint) {
    const utilisateur = await this.findOne(id);

    return this.prisma.utilisateur.update({
      where: { id },
      data: { actif: !utilisateur.actif },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
      },
    });
  }

  async resetPassword(id: bigint, nouveauMotDePasse: string) {
    await this.findOne(id);

    if (nouveauMotDePasse.length < 6) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
    }

    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);

    return this.prisma.utilisateur.update({
      where: { id },
      data: { motDePasse: hashedPassword },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
      },
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);

    return this.prisma.utilisateur.delete({
      where: { id },
    });
  }
}