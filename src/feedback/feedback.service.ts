import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackDto, UpdateFeedbackDto } from './feedback.dto';
import { Feedback, FeedbackStatus } from './feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepository.create(createFeedbackDto);
    return await this.feedbackRepository.save(feedback);
  }

  async findAll(): Promise<Feedback[]> {
    return await this.feedbackRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Feedback[]> {
    return await this.feedbackRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return feedback;
  }

  async update(id: string, updateFeedbackDto: UpdateFeedbackDto): Promise<Feedback> {
    const feedback = await this.findOne(id);

    if (
      updateFeedbackDto.status === FeedbackStatus.REVIEWED ||
      updateFeedbackDto.status === FeedbackStatus.RESOLVED
    ) {
      updateFeedbackDto.responseDate = new Date();
    }

    Object.assign(feedback, updateFeedbackDto);
    return await this.feedbackRepository.save(feedback);
  }

  async remove(id: string): Promise<void> {
    const feedback = await this.findOne(id);
    await this.feedbackRepository.remove(feedback);
  }

  async getStatistics() {
    const total = await this.feedbackRepository.count();
    const pending = await this.feedbackRepository.count({
      where: { status: FeedbackStatus.PENDING },
    });
    const reviewed = await this.feedbackRepository.count({
      where: { status: FeedbackStatus.REVIEWED },
    });
    const resolved = await this.feedbackRepository.count({
      where: { status: FeedbackStatus.RESOLVED },
    });

    const typeStats = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('feedback.type')
      .getRawMany();

    const ratingStats = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('AVG(feedback.rating)', 'averageRating')
      .addSelect('COUNT(*)', 'totalRatings')
      .getRawOne();

    return {
      total,
      byStatus: {
        pending,
        reviewed,
        resolved,
      },
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = parseInt(stat.count);
        return acc;
      }, {}),
      ratings: {
        average: parseFloat(ratingStats.averageRating || '0'),
        total: parseInt(ratingStats.totalRatings || '0'),
      },
    };
  }
}
