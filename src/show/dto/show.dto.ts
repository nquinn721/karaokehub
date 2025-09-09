import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsBoolean, IsUrl } from 'class-validator';
import { DayOfWeek } from '../show.entity';
import { HasVenueOrVenueData, RequiredForVenueCreation } from '../../common/validators/venue-validation.decorator';

export class CreateShowDto {
  @IsNotEmpty({ message: 'DJ is required for a show' })
  @IsUUID('4', { message: 'DJ ID must be a valid UUID' })
  djId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Venue ID must be a valid UUID' })
  @HasVenueOrVenueData()
  venueId?: string;

  // For creating a new venue
  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  @RequiredForVenueCreation()
  venueAddress?: string;

  @IsOptional()
  @IsString()
  venueCity?: string;

  @IsOptional()
  @IsString()
  venueState?: string;

  @IsOptional()
  @IsString()
  venueZip?: string;

  @IsOptional()
  @IsString()
  venuePhone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Venue website must be a valid URL' })
  venueWebsite?: string;

  // Show-specific details
  @IsNotEmpty({ message: 'Day of week is required' })
  @IsEnum(DayOfWeek, { message: 'Day must be a valid day of the week' })
  day: DayOfWeek;

  @IsNotEmpty({ message: 'Start time is required' })
  @IsString()
  startTime: string;

  @IsNotEmpty({ message: 'End time is required' })
  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  userSubmitted?: boolean;
}

export class UpdateShowDto {
  @IsOptional()
  @IsUUID('4', { message: 'DJ ID must be a valid UUID' })
  djId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Venue ID must be a valid UUID' })
  venueId?: string;

  @IsOptional()
  @IsEnum(DayOfWeek, { message: 'Day must be a valid day of the week' })
  day?: DayOfWeek;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  userSubmitted?: boolean;
}
