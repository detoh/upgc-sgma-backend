import { IsArray, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MembreImportRow {
  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsOptional()
  @IsString()
  sexe?: string;

  @IsString()
  dateAdhesion: string;

  @IsOptional()
  @IsString()
  dateNaissance?: string;  // 👈 AJOUTÉ

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  // Liste de périodes payées au format YYYY-MM
  @IsOptional()
  @IsArray()
  paiements?: string[];
}

export class ImportMembresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembreImportRow)
  membres: MembreImportRow[];
}