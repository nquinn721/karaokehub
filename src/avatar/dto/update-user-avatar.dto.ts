import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserAvatarDto {
  @IsString()
  baseAvatarId: string;

  @IsOptional()
  @IsUUID()
  microphoneId?: string;

  @IsOptional()
  @IsUUID()
  outfitId?: string;

  @IsOptional()
  @IsUUID()
  shoesId?: string;
}
