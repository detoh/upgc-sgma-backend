import { PartialType } from '@nestjs/mapped-types';
import { CreateFamilleDto } from './create-famille.dto';

export class UpdateFamilleDto extends PartialType(CreateFamilleDto) {}