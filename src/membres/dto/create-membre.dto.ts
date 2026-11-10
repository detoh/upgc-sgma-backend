import { 
  IsString, IsOptional, IsEmail, IsEnum, IsDateString, 
  MinLength, MaxLength, Matches 
} from 'class-validator';
import { SexeEnum, StatutMembre } from '@prisma/client';

export class CreateMembreDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @IsEnum(SexeEnum)
  sexe: SexeEnum;

  @IsDateString()
  dateNaissance: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  profession?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9\s\+\-]{8,20}$/, { message: 'Numéro de téléphone invalide' })
  telephone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  dateAdhesion?: string;

  @IsOptional()
  @IsEnum(StatutMembre)
  statut?: StatutMembre;

  @IsOptional()
  @IsString()
  utilisateurId?: string; // ID de l'utilisateur lié (compte)
}