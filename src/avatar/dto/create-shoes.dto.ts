import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ShoesRarity, ShoesType } from '../entities/shoes.entity';

export class CreateShoesDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ShoesType)
  type: ShoesType;

  @IsEnum(ShoesRarity)
  rarity: ShoesRarity;

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
