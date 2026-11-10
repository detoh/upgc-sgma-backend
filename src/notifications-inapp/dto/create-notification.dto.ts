import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';

export enum TypeNotification {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsString()
  titre: string;

  @IsString()
  message: string;

  @IsEnum(TypeNotification)
  type: TypeNotification;

  @IsOptional()
  @IsString()
  lien?: string;
}