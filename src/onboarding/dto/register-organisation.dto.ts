import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterOrganisationDto {
  // --- Organisation ---
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la mutuelle est obligatoire' })
  @MinLength(3, { message: 'Le nom doit contenir au moins 3 caractères' })
  nomOrganisation: string;

  @IsOptional()
  @IsString()
  telephoneOrganisation?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  // --- Administrateur ---
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  prenom: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
  @Matches(/^[0-9+\s]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  telephone: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  motDePasse: string;
}