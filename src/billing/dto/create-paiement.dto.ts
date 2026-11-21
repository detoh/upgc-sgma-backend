import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ModePaiement, PeriodeAbonnement } from '@prisma/client';

export class CreatePaiementDto {
  @IsInt()
  @Min(0)
  planId: number;

  @IsEnum(PeriodeAbonnement)
  periode: PeriodeAbonnement;

  @IsEnum(ModePaiement)
  modePaiement: ModePaiement;

  @IsOptional()
  @IsString()
  reference?: string; // Pour paiement cash : n° de reçu

  @IsOptional()
  @IsString()
  numeroTelephone?: string; // Pour CinetPay : numéro OM/MTN/Moov
}