import { IsEnum, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';
import { ModePaiementEnum } from '@prisma/client';

export class PayerPrestationDto {
  @IsEnum(ModePaiementEnum)
  modePaiement: ModePaiementEnum;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  datePaiement?: string;
}