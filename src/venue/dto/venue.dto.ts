import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateVenueDto {
  @IsNotEmpty({ message: 'Venue name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Address is required for a venue' })
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsLatitude({ message: 'Latitude must be a valid latitude' })
  lat?: number;

  @IsOptional()
  @IsLongitude({ message: 'Longitude must be a valid longitude' })
  lng?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  userSubmitted?: boolean;
}

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsLatitude({ message: 'Latitude must be a valid latitude' })
  lat?: number;

  @IsOptional()
  @IsLongitude({ message: 'Longitude must be a valid longitude' })
  lng?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  userSubmitted?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface VenueSearchFilters {
  city?: string;
  state?: string;
  isActive?: boolean;
  search?: string; // For name search
}
