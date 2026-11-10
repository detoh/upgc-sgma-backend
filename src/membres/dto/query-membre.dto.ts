import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SexeEnum, StatutMembre } from '@prisma/client';

export class QueryMembreDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StatutMembre)
  @Type(() => String)
  statut?: StatutMembre;

  @IsOptional()
  @IsEnum(SexeEnum)
  @Type(() => String)
  sexe?: SexeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}