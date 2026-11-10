import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUtilisateurDto } from './create-utilisateur.dto';

export class UpdateUtilisateurDto extends PartialType(
  OmitType(CreateUtilisateurDto, ['motDePasse'] as const),
) {}