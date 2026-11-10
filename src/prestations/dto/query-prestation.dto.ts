import { IsOptional, IsInt, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { StatutPrestation, TypePrestationEnum } from '@prisma/client';

export class QueryPrestationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  membreId?: number;

  @IsOptional()
  @IsEnum(StatutPrestation)
  statut?: StatutPrestation;

  @IsOptional()
  @IsEnum(TypePrestationEnum)
  typePrestation?: TypePrestationEnum;
}