import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ValiderPrestationDto {
  @IsBoolean()
  valider: boolean; // true = VALIDEE, false = REJETEE

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string; // Motif de rejet (si valider = false)
}