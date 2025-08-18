import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadDataDto } from './dto/upload.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('fetch-local-data')
  async fetchLocalData(): Promise<UploadDataDto> {
    try {
      return await this.uploadService.fetchLocalData();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch local data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
