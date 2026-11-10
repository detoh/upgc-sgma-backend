import { PartialType } from '@nestjs/mapped-types';
import { CreateActiviteDto } from './create-activite.dto';

export class UpdateActiviteDto extends PartialType(CreateActiviteDto) {}