import { 
  IsInt, IsEnum, IsOptional, IsString, IsDateString, 
  IsNumber, Min, MaxLength 
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypePrestationEnum } from '@prisma/client';

export class CreatePrestationDto {
  @Type(() => Number)
  @IsInt()
  membreId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  beneficiaireId?: number; // ID de l'ayant droit (si applicable)

  @IsEnum(TypePrestationEnum)
  typePrestation: TypePrestationEnum;

  @IsDateString()
  dateEvenement: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant: number;
}