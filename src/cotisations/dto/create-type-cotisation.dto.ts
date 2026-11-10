import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateTypeCotisationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  libelle: string;
}