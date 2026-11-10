import { IsArray, IsString, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MembreRelanceDto {
  @IsString()
  membreId: string;

  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsNumber()
  trimestresManquants: number;

  @IsNumber()
  montantDu: number;

  @IsString()
  dateAdhesion: string;
}

export class RelanceDto {
  @IsString()
  type: 'EMAIL' | 'SMS' | 'LES_DEUX';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembreRelanceDto)
  membres: MembreRelanceDto[];

  @IsOptional()
  @IsString()
  messagePersonnalise?: string;
}