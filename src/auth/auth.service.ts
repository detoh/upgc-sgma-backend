import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);

    const user = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        motDePasse: hashedPassword,
        telephone: dto.telephone,
        role: dto.role || 'GESTIONNAIRE',
      },
    });

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      },
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: loginDto.email },
    });

    if (!utilisateur) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!utilisateur.actif) {
      throw new UnauthorizedException('Ce compte est désactivé. Contactez un administrateur.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.motDePasse,
      utilisateur.motDePasse,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { dernierAcces: new Date() },
    });

    const token = this.generateToken(utilisateur);

    return {
      user: {
        id: utilisateur.id.toString(),
        email: utilisateur.email,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        role: utilisateur.role,
      },
      access_token: token,
    };
  }

  private generateToken(user: any) {
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(userId: bigint) {
    return this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
  }

  async getProfile(userId: bigint) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        dateCreation: true,
        dernierAcces: true,
        membres: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
          },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return utilisateur;
  }

  async updateProfile(userId: bigint, dto: UpdateProfileDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (dto.email && dto.email !== utilisateur.email) {
      const existingEmail = await this.prisma.utilisateur.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé par un autre utilisateur');
      }
    }

    return this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: dto.telephone,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        dateCreation: true,
      },
    });
  }

  async changePassword(userId: bigint, dto: ChangePasswordDto) {
    if (dto.nouveauMotDePasse !== dto.confirmationMotDePasse) {
      throw new BadRequestException('Le nouveau mot de passe et la confirmation ne correspondent pas');
    }

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.motDePasseActuel,
      utilisateur.motDePasse,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect');
    }

    const isSamePassword = await bcrypt.compare(
      dto.nouveauMotDePasse,
      utilisateur.motDePasse,
    );

    if (isSamePassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    const hashedPassword = await bcrypt.hash(dto.nouveauMotDePasse, 10);

    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { motDePasse: hashedPassword },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }
}