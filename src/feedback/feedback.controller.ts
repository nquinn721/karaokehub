import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFeedbackDto, UpdateFeedbackDto } from './feedback.dto';
import { Feedback } from './feedback.entity';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Body() createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    return await this.feedbackService.create(createFeedbackDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<Feedback[]> {
    return await this.feedbackService.findAll();
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string): Promise<Feedback[]> {
    return await this.feedbackService.findByUser(userId);
  }

  @Get('my-feedback')
  @UseGuards(JwtAuthGuard)
  async findMyFeedback(@Req() req: any): Promise<Feedback[]> {
    return await this.feedbackService.findByUser(req.user.id);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  async getStatistics() {
    return await this.feedbackService.getStatistics();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<Feedback> {
    return await this.feedbackService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<Feedback> {
    return await this.feedbackService.update(id, updateFeedbackDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.feedbackService.remove(id);
  }
}
