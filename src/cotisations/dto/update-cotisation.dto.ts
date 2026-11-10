import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCotisationDto } from './create-cotisation.dto';

// On ne permet pas de modifier membreId et typeCotisationId après création
export class UpdateCotisationDto extends PartialType(
  OmitType(CreateCotisationDto, ['membreId', 'typeCotisationId'] as const),
) {}