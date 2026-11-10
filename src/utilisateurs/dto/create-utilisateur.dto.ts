import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { RoleUtilisateur } from '@prisma/client';

export class CreateUtilisateurDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9\s\+\-]{8,20}$/)
  telephone?: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  motDePasse: string;

  @IsEnum(RoleUtilisateur)
  role: RoleUtilisateur;
}