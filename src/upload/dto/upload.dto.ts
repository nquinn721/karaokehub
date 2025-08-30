import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class VendorUploadDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  owner?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class DjUploadDto {
  @IsString()
  name: string;

  @IsString()
  vendorName: string;
}

export class VenueUploadDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  lat?: string;

  @IsString()
  @IsOptional()
  lng?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ShowUploadDto {
  @IsString()
  venue: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  day?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  djName?: string;

  @IsString()
  @IsOptional()
  vendorName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  venuePhone?: string;

  @IsString()
  @IsOptional()
  venueWebsite?: string;

  @IsString()
  @IsOptional()
  lat?: string;

  @IsString()
  @IsOptional()
  lng?: string;
}

export class UploadMetadataDto {
  @IsString()
  @IsOptional()
  uploadedBy?: string;

  @IsString()
  @IsOptional()
  uploadedAt?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UploadDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorUploadDto)
  vendors: VendorUploadDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DjUploadDto)
  djs: DjUploadDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShowUploadDto)
  shows: ShowUploadDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueUploadDto)
  venues: VenueUploadDto[];

  @ValidateNested()
  @Type(() => UploadMetadataDto)
  @IsOptional()
  metadata?: UploadMetadataDto;
}
