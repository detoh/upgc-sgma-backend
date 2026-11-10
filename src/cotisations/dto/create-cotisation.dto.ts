import { 
  IsString, IsInt, IsEnum, IsOptional, IsDateString, 
  IsNumber, Min, Matches 
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatutCotisation } from '@prisma/client';

export class CreateCotisationDto {
  @Type(() => Number)
  @IsInt()
  membreId: number;

  @Type(() => Number)
  @IsInt()
  typeCotisationId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant: number;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { 
    message: 'La période doit être au format YYYY-MM (ex: 2026-01)' 
  })
  periode: string;

  @IsOptional()
  @IsEnum(StatutCotisation)
  statut?: StatutCotisation;
}