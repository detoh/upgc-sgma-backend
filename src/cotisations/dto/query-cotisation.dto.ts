import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StatutCotisation } from '@prisma/client';

export class QueryCotisationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  membreId?: number;

  @IsOptional()
  @IsString()
  periode?: string; // Format YYYY-MM

  @IsOptional()
  @IsEnum(StatutCotisation)
  statut?: StatutCotisation;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  typeCotisationId?: number;
}