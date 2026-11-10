import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { RoleUtilisateur } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  nom: string;

  @IsString()
  @MinLength(2)
  prenom: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  motDePasse: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsEnum(RoleUtilisateur)
  role?: RoleUtilisateur;
}