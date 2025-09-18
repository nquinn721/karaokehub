import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MicrophoneRarity, MicrophoneType } from '../entities/microphone.entity';

export class CreateMicrophoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MicrophoneType)
  type: MicrophoneType;

  @IsEnum(MicrophoneRarity)
  rarity: MicrophoneRarity;

  @IsString()
  imageUrl: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isUnlockable?: boolean;

  @IsOptional()
  @IsString()
  unlockRequirement?: string;
}
