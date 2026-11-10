import { IsString, IsOptional, IsDateString, IsNumber, Min, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActiviteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lieu?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsable?: string;
}