import { 
  IsString, IsEnum, IsOptional, IsDateString, IsNumber, 
  Min, MaxLength, MinLength 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModePaiementEnum } from '@prisma/client';

export class CreateDonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  structureDonatrice: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant: number;

  @IsOptional()
  @IsDateString()
  dateDon?: string;

  @IsEnum(ModePaiementEnum)
  modePaiement: ModePaiementEnum;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}