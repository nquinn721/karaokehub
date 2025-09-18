import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { OutfitRarity, OutfitType } from '../entities/outfit.entity';

export class CreateOutfitDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(OutfitType)
  type: OutfitType;

  @IsEnum(OutfitRarity)
  rarity: OutfitRarity;

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

  @IsOptional()
  @IsDateString()
  seasonalStart?: Date;

  @IsOptional()
  @IsDateString()
  seasonalEnd?: Date;
}
