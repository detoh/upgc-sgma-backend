import { PartialType } from '@nestjs/mapped-types';
import { CreateMembreDto } from './create-membre.dto';

export class UpdateMembreDto extends PartialType(CreateMembreDto) {}