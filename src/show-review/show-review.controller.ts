import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShowReviewDto, ReviewShowDto, ShowReviewService } from './show-review.service';

@Controller('show-reviews')
@UseGuards(JwtAuthGuard)
export class ShowReviewController {
  constructor(private readonly showReviewService: ShowReviewService) {}

  @Post()
  create(@Body() createDto: CreateShowReviewDto) {
    return this.showReviewService.create(createDto);
  }

  @Get()
  findAll() {
    return this.showReviewService.findAll();
  }

  @Get('pending')
  findPending() {
    return this.showReviewService.findPending();
  }

  @Get('stats')
  getStats() {
    return this.showReviewService.getReviewStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showReviewService.findOne(id);
  }

  @Patch(':id/review')
  reviewSubmission(@Param('id') id: string, @Body() reviewDto: ReviewShowDto) {
    return this.showReviewService.reviewSubmission(id, reviewDto);
  }
}
