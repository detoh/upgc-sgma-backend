import { PartialType } from '@nestjs/mapped-types';
import { CreatePrestationDto } from './create-prestation.dto';

export class UpdatePrestationDto extends PartialType(CreatePrestationDto) {}