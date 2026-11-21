import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ValiderPaiementDto {
  @IsBoolean()
  approuve: boolean;

  @IsOptional()
  @IsString()
  motifRejet?: string;

  @IsOptional()
  @IsString()
  referenceExterne?: string; // ID transaction OM/MTN
}