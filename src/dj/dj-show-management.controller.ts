import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DjShowManagementService, UpdateShowDto } from './dj-show-management.service';

@Controller('dj-shows')
@UseGuards(AuthGuard('jwt'))
export class DjShowManagementController {
  constructor(private readonly djShowManagementService: DjShowManagementService) {}

  @Get()
  async getMyShows(@Request() req: any) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    return this.djShowManagementService.getDjShows(req.user.id);
  }

  @Put(':showId')
  async updateShow(
    @Request() req: any,
    @Param('showId') showId: string,
    @Body() updateData: UpdateShowDto,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    return this.djShowManagementService.updateShow(req.user.id, showId, updateData);
  }
}
