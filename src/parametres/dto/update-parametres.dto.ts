import { 
  IsString, IsOptional, IsEmail, IsInt, IsNumber, 
  IsObject, MinLength, MaxLength, Min 
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateParametresDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nomMutuelle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  typeCotisationDefautId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  montantCotisationDefaut?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  joursGrace?: number;

  @IsOptional()
  @IsObject()
  smtpConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  paiementEnLigneConfig?: Record<string, any>;
}