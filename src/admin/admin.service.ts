import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { ParsedSchedule, ParseStatus } from '../parser/parsed-schedule.entity';
import { ReviewStatus, ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(FavoriteShow)
    private favoriteShowRepository: Repository<FavoriteShow>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(ShowReview)
    private showReviewRepository: Repository<ShowReview>,
  ) {}

  async getStatistics() {
    const [
      totalUsers,
      activeUsers,
      totalVenues,
      totalShows,
      activeShows,
      totalDJs,
      totalVendors,
      totalFavorites,
      pendingParserReviews,
      pendingShowReviews,
      totalFeedback,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.venueRepository.count(),
      this.showRepository.count(),
      this.showRepository.count({ where: { isActive: true } }),
      this.djRepository.count(),
      this.vendorRepository.count(),
      this.favoriteShowRepository.count(),
      this.parsedScheduleRepository.count({ where: { status: ParseStatus.PENDING_REVIEW } }),
      this.showReviewRepository.count({ where: { status: ReviewStatus.PENDING } }),
      this.feedbackRepository.count(),
    ]);

    // Get growth statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newUsersLast30Days, newVenuesLast30Days, newShowsLast30Days] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount(),
      this.venueRepository
        .createQueryBuilder('venue')
        .where('venue.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount(),
      this.showRepository
        .createQueryBuilder('show')
        .where('show.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount(),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalVenues,
      totalShows,
      activeShows,
      totalDJs,
      totalVendors,
      totalFavorites,
      pendingReviews: pendingParserReviews + pendingShowReviews,
      pendingShowReviews,
      totalFeedback,
      growth: {
        newUsersLast30Days,
        newVenuesLast30Days,
        newShowsLast30Days,
      },
    };
  }

  async getRecentActivity() {
    // Get recent users (last 10)
    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Get recent venues (last 5)
    const recentVendors = await this.vendorRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Get recent shows (last 5)
    const recentShows = await this.showRepository.find({
      relations: ['dj', 'dj.vendor'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Get recent parser activities
    const recentParserActivities = await this.parsedScheduleRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const activities = [];

    // Add user registrations
    recentUsers.forEach((user) => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_registration',
        action: 'New user registered',
        details: user.name || user.email,
        timestamp: user.createdAt,
        severity: 'success',
      });
    });

    // Add venue additions
    recentVendors.forEach((vendor) => {
      activities.push({
        id: `vendor-${vendor.id}`,
        type: 'venue_added',
        action: 'New venue added',
        details: vendor.name,
        timestamp: vendor.createdAt,
        severity: 'info',
      });
    });

    // Add show additions
    recentShows.forEach((show) => {
      activities.push({
        id: `show-${show.id}`,
        type: 'show_added',
        action: 'New show scheduled',
        details: `${show.dj?.vendor?.name || 'Unknown Venue'} - ${show.day || 'No day specified'}`,
        timestamp: show.createdAt,
        severity: 'info',
      });
    });

    // Add parser activities
    recentParserActivities.forEach((parsed) => {
      activities.push({
        id: `parser-${parsed.id}`,
        type: 'parser_activity',
        action: 'Website parsed',
        details: `${parsed.url} - ${parsed.status}`,
        timestamp: parsed.createdAt,
        severity: parsed.status === ParseStatus.APPROVED ? 'success' : 'warning',
      });
    });

    // Sort by timestamp and return latest 20
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((activity) => ({
        ...activity,
        timeAgo: this.getTimeAgo(activity.timestamp),
      }));
  }

  async getSystemHealth() {
    try {
      // Check database connectivity
      await this.userRepository.query('SELECT 1');
      const dbHealthy = true;

      // Check if we have data
      const hasUsers = (await this.userRepository.count()) > 0;
      const hasVendors = (await this.vendorRepository.count()) > 0;
      const hasShows = (await this.showRepository.count()) > 0;

      const overallHealth = dbHealthy && hasUsers ? 98.5 : 85.0;

      return {
        overall: overallHealth,
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: Math.random() * 50 + 10, // Mock response time
        },
        api: {
          status: 'healthy',
          responseTime: Math.random() * 30 + 5,
        },
        parser: {
          status: 'active',
          lastRun: new Date(Date.now() - Math.random() * 3600000), // Last hour
        },
        dataIntegrity: {
          users: hasUsers,
          vendors: hasVendors,
          shows: hasShows,
        },
      };
    } catch (error) {
      return {
        overall: 0,
        database: {
          status: 'unhealthy',
          error: error.message,
        },
        api: {
          status: 'unhealthy',
        },
        parser: {
          status: 'error',
        },
        dataIntegrity: {
          users: false,
          vendors: false,
          shows: false,
        },
      };
    }
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Data Table Methods
  async getUsers(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    const query = this.userRepository.createQueryBuilder('user');

    if (search) {
      query.where('user.name LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`,
      });
    }

    // Default sorting
    if (sortBy) {
      // Map frontend column names to database field names
      const sortMap: { [key: string]: string } = {
        name: 'user.name',
        stageName: 'user.stageName',
        email: 'user.email',
        provider: 'user.provider',
        isAdmin: 'user.isAdmin',
        isActive: 'user.isActive',
        createdAt: 'user.createdAt',
      };

      const dbField = sortMap[sortBy] || 'user.createdAt';
      query.orderBy(dbField, sortOrder);
    } else {
      query.orderBy('user.createdAt', 'DESC');
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVenues(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    const query = this.venueRepository
      .createQueryBuilder('venue')
      .leftJoin(
        'venue.shows',
        'shows',
        'shows.isActive = :showActive AND shows.isValid = :showValid',
        {
          showActive: true,
          showValid: true,
        },
      )
      .addSelect('COUNT(DISTINCT shows.id)', 'showCount')
      .where('venue.isActive = :venueActive', { venueActive: true })
      .groupBy('venue.id');

    if (search) {
      query.andWhere('venue.name LIKE :search OR venue.address LIKE :search', {
        search: `%${search}%`,
      });
    }

    // Handle sorting
    if (sortBy) {
      const sortMap: { [key: string]: string } = {
        name: 'venue.name',
        address: 'venue.address',
        city: 'venue.city',
        state: 'venue.state',
        website: 'venue.website',
        createdAt: 'venue.createdAt',
        showCount: 'showCount',
      };

      const dbField = sortMap[sortBy] || 'venue.createdAt';
      query.orderBy(dbField, sortOrder);
    } else {
      query.orderBy('venue.createdAt', 'DESC');
    }

    const result = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    // Combine entity data with counts
    const itemsWithCounts = result.entities.map((venue, index) => ({
      ...venue,
      showCount: parseInt(result.raw[index].showCount) || 0,
    }));

    // Get total count separately for pagination
    const totalQuery = this.venueRepository
      .createQueryBuilder('venue')
      .where('venue.isActive = :venueActive', { venueActive: true });
    if (search) {
      totalQuery.andWhere('venue.name LIKE :search OR venue.address LIKE :search', {
        search: `%${search}%`,
      });
    }
    const totalCount = await totalQuery.getCount();

    return {
      items: itemsWithCounts,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async getDjs(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    const query = this.djRepository
      .createQueryBuilder('dj')
      .leftJoinAndSelect('dj.vendor', 'vendor');

    if (search) {
      query.where('dj.name LIKE :search OR vendor.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    // Handle sorting
    if (sortBy) {
      const sortMap: { [key: string]: string } = {
        name: 'dj.name',
        vendor: 'vendor.name',
        createdAt: 'dj.createdAt',
      };

      const dbField = sortMap[sortBy] || 'dj.createdAt';
      query.orderBy(dbField, sortOrder);
    } else {
      query.orderBy('dj.createdAt', 'DESC');
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVendors(page = 1, limit = 10, search?: string) {
    const query = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoin('vendor.djs', 'djs', 'djs.isActive = :djActive', {
        djActive: true,
      })
      .addSelect('COUNT(DISTINCT djs.id)', 'djCount')
      .where('vendor.isActive = :vendorActive', { vendorActive: true })
      .groupBy('vendor.id');

    if (search) {
      query.andWhere('vendor.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    const result = await query
      .orderBy('vendor.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    // Combine entity data with counts
    const itemsWithCounts = result.entities.map((vendor, index) => ({
      ...vendor,
      djCount: parseInt(result.raw[index].djCount) || 0,
    }));

    // Get total count separately for pagination
    const totalQuery = this.vendorRepository
      .createQueryBuilder('vendor')
      .where('vendor.isActive = :vendorActive', { vendorActive: true });
    if (search) {
      totalQuery.andWhere('vendor.name LIKE :search', {
        search: `%${search}%`,
      });
    }
    const totalCount = await totalQuery.getCount();

    return {
      items: itemsWithCounts,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async getShows(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    const query = this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .leftJoinAndSelect('show.venue', 'venue');

    if (search) {
      query.where(
        'venue.name LIKE :search OR dj.name LIKE :search OR vendor.name LIKE :search OR show.description LIKE :search',
        {
          search: `%${search}%`,
        },
      );
    }

    // Handle sorting
    if (sortBy) {
      const sortMap: { [key: string]: string } = {
        dj: 'dj.name',
        vendor: 'vendor.name',
        venue: 'venue.name',
        description: 'show.description',
        startTime: 'show.startTime',
        endTime: 'show.endTime',
        isActive: 'show.isActive',
        createdAt: 'show.createdAt',
      };

      const dbField = sortMap[sortBy] || 'show.createdAt';
      query.orderBy(dbField, sortOrder);
    } else {
      query.orderBy('show.createdAt', 'DESC');
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFavorites(page = 1, limit = 10, search?: string) {
    const query = this.favoriteShowRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.user', 'user')
      .leftJoinAndSelect('favorite.show', 'show')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor');

    if (search) {
      query.where('user.name LIKE :search OR user.email LIKE :search OR vendor.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('favorite.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSongs(page = 1, limit = 10, search?: string) {
    // For songs, we'll use the ParsedSchedule entity as it contains song data
    const query = this.parsedScheduleRepository
      .createQueryBuilder('parsed')
      .where('parsed.status = :status', { status: ParseStatus.APPROVED });

    if (search) {
      query.andWhere('parsed.url LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('parsed.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => ({
        id: item.id,
        url: item.url,
        rawData: item.rawData,
        aiAnalysis: item.aiAnalysis,
        status: item.status,
        createdAt: item.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getParserStatus() {
    const [totalParsed, pending, approved, rejected, recentActivity] = await Promise.all([
      this.parsedScheduleRepository.count(),
      this.parsedScheduleRepository.count({ where: { status: ParseStatus.PENDING_REVIEW } }),
      this.parsedScheduleRepository.count({ where: { status: ParseStatus.APPROVED } }),
      this.parsedScheduleRepository.count({ where: { status: ParseStatus.REJECTED } }),
      this.parsedScheduleRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      status: 'active',
      statistics: {
        totalParsed,
        pending,
        approved,
        rejected,
        successRate: totalParsed > 0 ? Math.round((approved / totalParsed) * 100) : 0,
      },
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        url: item.url,
        status: item.status,
        createdAt: item.createdAt,
        timeAgo: this.getTimeAgo(item.createdAt),
      })),
    };
  }

  // Delete methods
  async deleteVenue(id: string) {
    try {
      const venue = await this.venueRepository.findOne({
        where: { id },
        relations: ['shows'],
      });

      if (!venue) {
        throw new Error('Venue not found');
      }

      // First, delete all related favorites for shows at this venue
      if (venue.shows && venue.shows.length > 0) {
        for (const show of venue.shows) {
          // Delete favorites for this show
          await this.favoriteShowRepository.delete({ show: { id: show.id } });
        }

        // Delete all shows at this venue
        await this.showRepository.delete(venue.shows.map((show) => show.id));
      }

      // Finally, delete the venue itself
      await this.venueRepository.remove(venue);

      return { message: 'Venue and all related data deleted successfully' };
    } catch (error) {
      console.error('Error in deleteVenue:', error);
      throw error;
    }
  }

  async deleteVendor(id: string) {
    try {
      const vendor = await this.vendorRepository.findOne({
        where: { id },
        relations: ['djs', 'djs.shows'],
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // First, delete all related favorites and shows for DJs under this vendor
      if (vendor.djs && vendor.djs.length > 0) {
        for (const dj of vendor.djs) {
          if (dj.shows && dj.shows.length > 0) {
            for (const show of dj.shows) {
              // Delete favorites for this show
              await this.favoriteShowRepository.delete({ show: { id: show.id } });
            }
            // Delete all shows for this DJ
            await this.showRepository.delete(dj.shows.map((show) => show.id));
          }
        }

        // Delete all DJs under this vendor
        await this.djRepository.delete(vendor.djs.map((dj) => dj.id));
      }

      // Finally, delete the vendor itself
      await this.vendorRepository.remove(vendor);

      return { message: 'Vendor and all related data deleted successfully' };
    } catch (error) {
      console.error('Error in deleteVendor:', error);
      throw error;
    }
  }

  async deleteShow(id: string) {
    try {
      console.log(`Starting deletion process for show ID: ${id}`);

      const show = await this.showRepository.findOne({
        where: { id },
      });

      if (!show) {
        throw new Error('Show not found');
      }

      console.log(`Found show: ${show.venue || 'Unknown Venue'}`);

      // With CASCADE delete configured on FavoriteShow and ShowReview entities,
      // related records should be automatically deleted
      console.log('Attempting to delete show with CASCADE deletes...');
      await this.showRepository.remove(show);
      console.log('Show deleted successfully');

      return { message: 'Show and all related data deleted successfully' };
    } catch (error) {
      console.error('Detailed error deleting show:', error);

      // Provide more specific error messages based on the error type
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
        throw new Error(
          `Cannot delete this show because it has related data in other tables. Foreign key constraint failed: ${error.message}`,
        );
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
        throw new Error(`Cannot delete this show due to a reference constraint: ${error.message}`);
      } else {
        throw new Error(`Cannot delete this show. Error: ${error.message}`);
      }
    }
  }

  async deleteDj(id: string) {
    const dj = await this.djRepository.findOne({
      where: { id },
      relations: ['shows'],
    });

    if (!dj) {
      throw new Error('DJ not found');
    }

    // Set DJ references to null in shows before deleting
    await this.showRepository.update({ djId: id }, { djId: null });

    await this.djRepository.remove(dj);
    return { message: 'DJ and all related data deleted successfully' };
  }

  // Update methods
  async updateVenue(id: string, updateData: any) {
    const venue = await this.venueRepository.findOne({ where: { id } });

    if (!venue) {
      throw new Error('Venue not found');
    }

    await this.venueRepository.update(id, {
      name: updateData.name,
      address: updateData.address,
      city: updateData.city,
      state: updateData.state,
      zip: updateData.zip,
      phone: updateData.phone,
      website: updateData.website,
      description: updateData.description,
      lat: updateData.lat,
      lng: updateData.lng,
    });

    return { message: 'Venue updated successfully' };
  }

  async updateShow(id: string, updateData: any) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throw new Error('Show not found');
    }

    await this.showRepository.update(id, {
      day: updateData.day,
      time: updateData.time,
      description: updateData.description,
    });

    return { message: 'Show updated successfully' };
  }

  async updateDj(id: string, updateData: any) {
    const dj = await this.djRepository.findOne({ where: { id } });

    if (!dj) {
      throw new Error('DJ not found');
    }

    await this.djRepository.update(id, {
      name: updateData.name,
    });

    return { message: 'DJ updated successfully' };
  }

  async updateVendor(id: string, updateData: any) {
    const vendor = await this.vendorRepository.findOne({ where: { id } });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    await this.vendorRepository.update(id, {
      name: updateData.name,
      website: updateData.website,
      instagram: updateData.instagram,
      facebook: updateData.facebook,
      isActive: updateData.isActive,
    });

    return { message: 'Vendor updated successfully' };
  }

  // Relationship methods
  async getVenueRelationships(id: string) {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ['shows', 'shows.dj', 'shows.dj.vendor'],
    });

    if (!venue) {
      throw new Error('Venue not found');
    }

    return {
      venue: venue,
      shows: venue.shows,
    };
  }

  async getDjRelationships(id: string) {
    const shows = await this.showRepository.find({
      where: { djId: id },
      relations: ['vendor'],
    });

    return {
      shows,
    };
  }

  async getFeedback(page: number = 1, limit: number = 10, search?: string) {
    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user');

    if (search) {
      queryBuilder.where(
        '(feedback.subject LIKE :search OR feedback.message LIKE :search OR feedback.email LIKE :search OR feedback.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('feedback.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateFeedback(id: string, updateData: any) {
    await this.feedbackRepository.update(id, updateData);
    return await this.feedbackRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async deleteFeedback(id: string) {
    const result = await this.feedbackRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Feedback not found');
    }
    return { message: 'Feedback deleted successfully' };
  }

  async getShowReviews(page: number = 1, limit: number = 10, search?: string) {
    const queryBuilder = this.showReviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.show', 'show')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .leftJoinAndSelect('review.submittedByUser', 'submittedBy')
      .leftJoinAndSelect('review.reviewedByUser', 'reviewedBy');

    if (search) {
      queryBuilder.where(
        '(review.djName LIKE :search OR review.vendorName LIKE :search OR review.venueName LIKE :search OR review.comments LIKE :search OR show.venue LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateShowReview(id: string, updateData: any) {
    await this.showReviewRepository.update(id, updateData);
    return await this.showReviewRepository.findOne({
      where: { id },
      relations: ['show', 'show.dj', 'show.dj.vendor', 'submittedByUser', 'reviewedByUser'],
    });
  }

  async deleteShowReview(id: string) {
    const result = await this.showReviewRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Show review not found');
    }
    return { message: 'Show review deleted successfully' };
  }

  async detectDuplicatesInParsedSchedule(parsedScheduleId: string) {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    const aiAnalysis = parsedSchedule.aiAnalysis;
    if (!aiAnalysis || !aiAnalysis.shows) {
      throw new Error('No shows data found in parsed schedule');
    }

    const shows = aiAnalysis.shows;
    const duplicateGroups = [];
    const seenKeys = new Map<string, any[]>();

    // Group shows by address-day-starttime
    for (const show of shows) {
      const address = (show.address || '').toLowerCase().trim();
      const day = (show.day || '').toLowerCase().trim();
      const startTime = (show.startTime || show.time || '').toLowerCase().trim();
      const key = `${address}-${day}-${startTime}`;

      if (!seenKeys.has(key)) {
        seenKeys.set(key, []);
      }
      seenKeys.get(key)!.push(show);
    }

    // Find groups with duplicates
    for (const [key, group] of seenKeys.entries()) {
      if (group.length > 1) {
        duplicateGroups.push({
          key,
          count: group.length,
          shows: group,
          address: group[0].address,
          day: group[0].day,
          startTime: group[0].startTime || group[0].time,
        });
      }
    }

    return {
      totalShows: shows.length,
      duplicateGroups,
      duplicateCount: duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0),
      uniqueShowsAfterDedup:
        shows.length - duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0),
    };
  }

  async removeDuplicatesFromParsedSchedule(parsedScheduleId: string, keepIndices: number[] = []) {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    const aiAnalysis = parsedSchedule.aiAnalysis;
    if (!aiAnalysis || !aiAnalysis.shows) {
      throw new Error('No shows data found in parsed schedule');
    }

    const shows = aiAnalysis.shows;
    const uniqueShows = [];
    const seenKeys = new Set<string>();
    const duplicateGroups = new Map<string, any[]>();

    // First pass: identify duplicate groups
    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const address = (show.address || '').toLowerCase().trim();
      const day = (show.day || '').toLowerCase().trim();
      const startTime = (show.startTime || show.time || '').toLowerCase().trim();
      const key = `${address}-${day}-${startTime}`;

      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push({ ...show, originalIndex: i });
    }

    // Second pass: keep only one from each group (first one or specified index)
    for (const [key, group] of duplicateGroups.entries()) {
      if (group.length === 1) {
        // Not a duplicate, keep it
        uniqueShows.push(group[0]);
      } else {
        // Multiple shows with same key, keep only one
        let showToKeep = group[0]; // Default to first

        // If keepIndices are specified, try to find a match
        if (keepIndices.length > 0) {
          const matchingShow = group.find((show) => keepIndices.includes(show.originalIndex));
          if (matchingShow) {
            showToKeep = matchingShow;
          }
        }

        // Remove the originalIndex property before saving
        const { originalIndex, ...cleanShow } = showToKeep;
        uniqueShows.push(cleanShow);
      }
    }

    // Update the parsed schedule with deduplicated data
    const updatedAiAnalysis = {
      ...aiAnalysis,
      shows: uniqueShows,
      stats: {
        ...aiAnalysis.stats,
        showsFound: uniqueShows.length,
      },
    };

    await this.parsedScheduleRepository.update(parsedScheduleId, {
      aiAnalysis: updatedAiAnalysis,
    });

    return {
      originalCount: shows.length,
      uniqueCount: uniqueShows.length,
      removedCount: shows.length - uniqueShows.length,
      message: `Removed ${shows.length - uniqueShows.length} duplicate shows. ${uniqueShows.length} unique shows remain.`,
    };
  }
}
