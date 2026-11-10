import { IsString, IsOptional, IsEnum, IsDateString, MinLength, MaxLength, Matches } from 'class-validator';
import { LienParenteEnum } from '@prisma/client';

export class CreateFamilleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @IsEnum(LienParenteEnum)
  lienParente: LienParenteEnum;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9\s\+\-]{8,20}$/)
  telephone?: string;
}