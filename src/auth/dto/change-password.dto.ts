import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  @IsString()
  motDePasseActuel: string;

  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @IsString()
  @MinLength(6, { message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(100)
  nouveauMotDePasse: string;

  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  @IsString()
  confirmationMotDePasse: string;
}