import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show } from '../show/show.entity';
import { ShowService } from '../show/show.service';
import { ReviewStatus, ShowReview } from './show-review.entity';

export interface CreateShowReviewDto {
  showId: string;
  submittedByUserId: string;
  djName?: string;
  vendorName?: string;
  venueName?: string;
  venuePhone?: string;
  venueWebsite?: string;
  description?: string;
  comments?: string;
}

export interface ReviewShowDto {
  approve: boolean;
  adminNotes?: string;
  reviewedByUserId: string;
}

@Injectable()
export class ShowReviewService {
  private readonly logger = new Logger(ShowReviewService.name);

  constructor(
    @InjectRepository(ShowReview)
    private readonly showReviewRepository: Repository<ShowReview>,
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    private readonly showService: ShowService,
  ) {}

  async create(createDto: CreateShowReviewDto): Promise<ShowReview> {
    try {
      // Verify the show exists
      const show = await this.showRepository.findOne({
        where: { id: createDto.showId },
      });

      if (!show) {
        throw new NotFoundException('Show not found');
      }

      // Check if there's already a pending review for this show
      const existingReview = await this.showReviewRepository.findOne({
        where: {
          showId: createDto.showId,
          status: ReviewStatus.PENDING,
        },
      });

      if (existingReview) {
        throw new Error('There is already a pending review for this show');
      }

      const review = this.showReviewRepository.create(createDto);
      const savedReview = await this.showReviewRepository.save(review);

      this.logger.log(
        `New show review created for show ${createDto.showId} by user ${createDto.submittedByUserId}`,
      );
      return savedReview;
    } catch (error) {
      this.logger.error('Error creating show review:', error);
      throw error;
    }
  }

  async findAll(): Promise<ShowReview[]> {
    try {
      return await this.showReviewRepository.find({
        relations: ['show', 'show.dj', 'show.dj.vendor'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error fetching show reviews:', error);
      throw error;
    }
  }

  async findPending(): Promise<ShowReview[]> {
    try {
      return await this.showReviewRepository.find({
        where: { status: ReviewStatus.PENDING },
        relations: ['show', 'show.dj', 'show.dj.vendor'],
        order: { createdAt: 'ASC' }, // Oldest first for review queue
      });
    } catch (error) {
      this.logger.error('Error fetching pending show reviews:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<ShowReview> {
    try {
      const review = await this.showReviewRepository.findOne({
        where: { id },
        relations: ['show', 'show.dj', 'show.dj.vendor'],
      });

      if (!review) {
        throw new NotFoundException('Show review not found');
      }

      return review;
    } catch (error) {
      this.logger.error('Error fetching show review:', error);
      throw error;
    }
  }

  async reviewSubmission(id: string, reviewDto: ReviewShowDto): Promise<ShowReview> {
    try {
      const review = await this.findOne(id);

      if (review.status !== ReviewStatus.PENDING) {
        throw new Error('This review has already been processed');
      }

      // Update review status
      review.status = reviewDto.approve ? ReviewStatus.APPROVED : ReviewStatus.DECLINED;
      review.adminNotes = reviewDto.adminNotes;
      review.reviewedByUserId = reviewDto.reviewedByUserId;
      review.reviewedAt = new Date();

      // If approved, update the show with the submitted information
      if (reviewDto.approve) {
        await this.applyReviewToShow(review);
      }

      // Save the review with updated status
      const updatedReview = await this.showReviewRepository.save(review);

      // Delete the review record (as requested)
      await this.showReviewRepository.remove(review);

      this.logger.log(
        `Show review ${id} ${reviewDto.approve ? 'approved' : 'declined'} by user ${reviewDto.reviewedByUserId}`,
      );

      return updatedReview;
    } catch (error) {
      this.logger.error('Error reviewing submission:', error);
      throw error;
    }
  }

  private async applyReviewToShow(review: ShowReview): Promise<void> {
    try {
      const show = await this.showRepository.findOne({
        where: { id: review.showId },
        relations: ['dj', 'dj.vendor'],
      });

      if (!show) {
        throw new NotFoundException('Show not found');
      }

      // Update show fields if provided in review
      if (review.venueName) {
        show.venue = review.venueName;
      }

      if (review.venuePhone) {
        show.venuePhone = review.venuePhone;
      }

      if (review.venueWebsite) {
        show.venueWebsite = review.venueWebsite;
      }

      if (review.description) {
        show.description = review.description;
      }

      // Save updated show
      await this.showRepository.save(show);

      // Handle DJ and vendor updates (this might require additional logic)
      if (review.djName || review.vendorName) {
        // This would require additional service methods to update/create DJ/vendor entities
        // For now, we'll log this for manual handling
        this.logger.log(
          `DJ/Vendor update requested for show ${show.id}: DJ=${review.djName}, Vendor=${review.vendorName}`,
        );
      }

      this.logger.log(`Show ${show.id} updated with approved review data`);
    } catch (error) {
      this.logger.error('Error applying review to show:', error);
      throw error;
    }
  }

  async getReviewStats(): Promise<{
    pending: number;
    approved: number;
    declined: number;
    total: number;
  }> {
    try {
      const [pending, approved, declined] = await Promise.all([
        this.showReviewRepository.count({ where: { status: ReviewStatus.PENDING } }),
        this.showReviewRepository.count({ where: { status: ReviewStatus.APPROVED } }),
        this.showReviewRepository.count({ where: { status: ReviewStatus.DECLINED } }),
      ]);

      return {
        pending,
        approved,
        declined,
        total: pending + approved + declined,
      };
    } catch (error) {
      this.logger.error('Error fetching review stats:', error);
      throw error;
    }
  }
}
