import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avatar } from '../avatar/entities/avatar.entity';
import { UserAvatar } from '../avatar/entities/user-avatar.entity';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { ParsedSchedule, ParseStatus } from '../parser/parsed-schedule.entity';
import { ReviewStatus, ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { CoinPackage } from '../store/entities/coin-package.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../store/entities/transaction.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';

export interface VenueVerificationResult {
  success: boolean;
  message: string;
  venue: Venue;
  originalData?: any;
  updatedFields?: string[];
  geocodeResult?: any;
  error?: string;
}

@Injectable()
export class AdminService {
  private genAI: GoogleGenerativeAI;

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
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(CoinPackage)
    private coinPackageRepository: Repository<CoinPackage>,
    @InjectRepository(Avatar)
    private avatarRepository: Repository<Avatar>,
    @InjectRepository(UserAvatar)
    private userAvatarRepository: Repository<UserAvatar>,
    private geocodingService: GeocodingService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

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
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.equippedAvatar', 'equippedAvatar');

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

  // Avatar Management
  async assignAvatarToUser(userId: string, avatarId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const avatar = await this.avatarRepository.findOne({
      where: { id: avatarId },
    });
    if (!avatar) {
      throw new Error('Avatar not found');
    }

    // Create user_avatar record if it doesn't exist (for non-free avatars)
    if (!avatar.isFree) {
      const existingUserAvatar = await this.userAvatarRepository.findOne({
        where: { userId, baseAvatarId: avatarId },
      });

      if (!existingUserAvatar) {
        await this.userAvatarRepository.save({
          id: require('crypto').randomUUID(),
          userId,
          baseAvatarId: avatarId,
          acquiredAt: new Date(),
        });
      }
    }

    // Update user's equipped avatar
    await this.userRepository.update(userId, { equippedAvatarId: avatarId });

    return { success: true, message: `Avatar ${avatar.name} assigned to user` };
  }

  async getAvailableAvatars() {
    const avatars = await this.avatarRepository.find({
      where: { isAvailable: true },
      order: { isFree: 'DESC', name: 'ASC' },
    });
    return avatars;
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
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.submittedByUser', 'submittedBy');

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

  /**
   * Verify and update venue location data using Gemini AI
   */
  async verifyVenueLocation(venueId: string): Promise<VenueVerificationResult> {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
      relations: ['shows'],
    });

    if (!venue) {
      throw new Error('Venue not found');
    }

    // Build address string for geocoding
    const addressParts = [venue.name, venue.address, venue.city, venue.state, venue.zip]
      .filter(Boolean)
      .join(', ');

    if (!addressParts.trim()) {
      return {
        success: false,
        message: 'No address information available for geocoding',
        venue: venue,
      };
    }

    try {
      // Use Gemini AI to verify and correct the location
      const geocodeResult = await this.geocodingService.geocodeAddressHybrid(addressParts);

      if (!geocodeResult) {
        return {
          success: false,
          message: 'Unable to geocode venue address',
          venue: venue,
        };
      }

      const updatedFields = [];
      const originalData = { ...venue };

      // Update coordinates if they're missing or significantly different
      if (
        !venue.lat ||
        !venue.lng ||
        Math.abs(venue.lat - geocodeResult.lat) > 0.01 ||
        Math.abs(venue.lng - geocodeResult.lng) > 0.01
      ) {
        venue.lat = geocodeResult.lat;
        venue.lng = geocodeResult.lng;
        updatedFields.push('coordinates');
      }

      // Update city, state, zip if they're missing or different
      if (geocodeResult.city && (!venue.city || venue.city !== geocodeResult.city)) {
        venue.city = geocodeResult.city;
        updatedFields.push('city');
      }

      if (geocodeResult.state && (!venue.state || venue.state !== geocodeResult.state)) {
        venue.state = geocodeResult.state;
        updatedFields.push('state');
      }

      if (geocodeResult.zip && (!venue.zip || venue.zip !== geocodeResult.zip)) {
        venue.zip = geocodeResult.zip;
        updatedFields.push('zip');
      }

      // Save changes if any were made
      if (updatedFields.length > 0) {
        await this.venueRepository.save(venue);
      }

      return {
        success: true,
        message:
          updatedFields.length > 0
            ? `Updated venue location data: ${updatedFields.join(', ')}`
            : 'Venue location data is already accurate',
        venue: venue,
        originalData: originalData,
        updatedFields: updatedFields,
        geocodeResult: geocodeResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error verifying venue location: ${error.message}`,
        venue: venue,
        error: error.message,
      };
    }
  }

  /**
   * Validate all venues using Gemini AI to lookup geo data and find conflicts
   */
  async validateAllVenuesWithGemini(): Promise<{
    success: boolean;
    results: any[];
    summary: {
      totalVenues: number;
      validatedCount: number;
      conflictsFound: number;
      updatedCount: number;
      errorsCount: number;
    };
  }> {
    try {
      // Get all active venues
      const venues = await this.venueRepository.find({
        where: { isActive: true },
        relations: ['shows'],
      });

      const results = [];
      let validatedCount = 0;
      let conflictsFound = 0;
      let updatedCount = 0;
      let errorsCount = 0;

      for (const venue of venues) {
        try {
          // Build search query for Gemini
          const searchQuery = [venue.name, venue.address, venue.city, venue.state]
            .filter(Boolean)
            .join(', ');

          if (!searchQuery.trim()) {
            results.push({
              venueId: venue.id,
              venueName: venue.name,
              status: 'skipped',
              message: 'Insufficient data for validation',
              currentData: this.extractVenueData(venue),
            });
            continue;
          }

          // Use Gemini to lookup venue information
          const geminiResult = await this.lookupVenueWithGemini(searchQuery, venue);
          validatedCount++;

          if (geminiResult.hasConflicts) {
            conflictsFound++;
          }

          if (geminiResult.wasUpdated) {
            updatedCount++;
            // Update the venue in database
            await this.venueRepository.save(venue);
          }

          results.push({
            venueId: venue.id,
            venueName: venue.name,
            status: geminiResult.hasConflicts ? 'conflict' : 'validated',
            message: geminiResult.message,
            currentData: geminiResult.currentData,
            suggestedData: geminiResult.suggestedData,
            conflicts: geminiResult.conflicts,
            wasUpdated: geminiResult.wasUpdated,
            confidence: geminiResult.confidence,
          });
        } catch (error) {
          errorsCount++;
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            status: 'error',
            message: `Error validating venue: ${error.message}`,
            currentData: this.extractVenueData(venue),
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        results,
        summary: {
          totalVenues: venues.length,
          validatedCount,
          conflictsFound,
          updatedCount,
          errorsCount,
        },
      };
    } catch (error) {
      throw new Error(`Failed to validate venues: ${error.message}`);
    }
  }

  /**
   * Use Gemini AI to lookup venue information and compare with database
   */
  private async lookupVenueWithGemini(
    searchQuery: string,
    venue: any,
  ): Promise<{
    hasConflicts: boolean;
    wasUpdated: boolean;
    message: string;
    currentData: any;
    suggestedData: any;
    conflicts: string[];
    confidence: number;
  }> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const prompt = `You are a venue data validation expert. Look up accurate information for this venue and compare it with the current database data.

Venue to lookup: "${searchQuery}"

Current database data:
- Name: ${venue.name}
- Address: ${venue.address || 'Not provided'}
- City: ${venue.city || 'Not provided'}
- State: ${venue.state || 'Not provided'}
- ZIP: ${venue.zip || 'Not provided'}
- Phone: ${venue.phone || 'Not provided'}
- Website: ${venue.website || 'Not provided'}
- Coordinates: ${venue.lat && venue.lng ? `${venue.lat}, ${venue.lng}` : 'Not provided'}

Please find the most accurate, up-to-date information for this venue and return a JSON response with this structure:

{
  "venueFound": true/false,
  "confidence": 0.0-1.0,
  "suggestedData": {
    "name": "Exact venue name",
    "address": "Full street address",
    "city": "City name",
    "state": "State abbreviation (2 letters)",
    "zip": "ZIP code",
    "phone": "Phone number",
    "website": "Website URL",
    "lat": number,
    "lng": number
  },
  "conflicts": [
    "List of specific conflicts found between current and suggested data"
  ],
  "message": "Summary of findings"
}

If the venue cannot be found or you're not confident in the information, set venueFound to false and confidence to 0.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const geminiData = JSON.parse(jsonMatch[0]);

      if (!geminiData.venueFound || geminiData.confidence < 0.7) {
        return {
          hasConflicts: false,
          wasUpdated: false,
          message: geminiData.message || 'Venue not found or low confidence',
          currentData: this.extractVenueData(venue),
          suggestedData: null,
          conflicts: [],
          confidence: geminiData.confidence || 0,
        };
      }

      // Compare data and identify conflicts
      const conflicts = this.compareVenueData(venue, geminiData.suggestedData);
      const hasConflicts = conflicts.length > 0;

      // Auto-update certain fields if they're missing and confidence is high
      let wasUpdated = false;
      if (geminiData.confidence >= 0.9) {
        if (!venue.lat && geminiData.suggestedData.lat) {
          venue.lat = geminiData.suggestedData.lat;
          wasUpdated = true;
        }
        if (!venue.lng && geminiData.suggestedData.lng) {
          venue.lng = geminiData.suggestedData.lng;
          wasUpdated = true;
        }
        if (!venue.phone && geminiData.suggestedData.phone) {
          venue.phone = geminiData.suggestedData.phone;
          wasUpdated = true;
        }
        if (!venue.website && geminiData.suggestedData.website) {
          venue.website = geminiData.suggestedData.website;
          wasUpdated = true;
        }
        if (!venue.zip && geminiData.suggestedData.zip) {
          venue.zip = geminiData.suggestedData.zip;
          wasUpdated = true;
        }
      }

      return {
        hasConflicts,
        wasUpdated,
        message: geminiData.message,
        currentData: this.extractVenueData(venue),
        suggestedData: geminiData.suggestedData,
        conflicts,
        confidence: geminiData.confidence,
      };
    } catch (error) {
      throw new Error(`Gemini lookup failed: ${error.message}`);
    }
  }

  /**
   * Compare venue data and identify conflicts
   */
  private compareVenueData(current: any, suggested: any): string[] {
    const conflicts = [];

    // Compare key fields
    if (
      current.name &&
      suggested.name &&
      current.name.toLowerCase() !== suggested.name.toLowerCase()
    ) {
      conflicts.push(`Name: "${current.name}" vs "${suggested.name}"`);
    }

    if (
      current.address &&
      suggested.address &&
      current.address.toLowerCase() !== suggested.address.toLowerCase()
    ) {
      conflicts.push(`Address: "${current.address}" vs "${suggested.address}"`);
    }

    if (
      current.city &&
      suggested.city &&
      current.city.toLowerCase() !== suggested.city.toLowerCase()
    ) {
      conflicts.push(`City: "${current.city}" vs "${suggested.city}"`);
    }

    if (
      current.state &&
      suggested.state &&
      current.state.toLowerCase() !== suggested.state.toLowerCase()
    ) {
      conflicts.push(`State: "${current.state}" vs "${suggested.state}"`);
    }

    if (current.zip && suggested.zip && current.zip !== suggested.zip) {
      conflicts.push(`ZIP: "${current.zip}" vs "${suggested.zip}"`);
    }

    if (current.phone && suggested.phone && current.phone !== suggested.phone) {
      conflicts.push(`Phone: "${current.phone}" vs "${suggested.phone}"`);
    }

    // Check coordinates if both exist
    if (current.lat && current.lng && suggested.lat && suggested.lng) {
      const distance = this.calculateDistance(
        current.lat,
        current.lng,
        suggested.lat,
        suggested.lng,
      );
      if (distance > 0.5) {
        // More than 0.5 miles apart
        conflicts.push(
          `Location: Current coordinates are ${distance.toFixed(2)} miles from suggested location`,
        );
      }
    }

    return conflicts;
  }

  /**
   * Calculate distance between two points in miles
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Extract venue data for comparison
   */
  private extractVenueData(venue: any) {
    return {
      name: venue.name,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      zip: venue.zip,
      phone: venue.phone,
      website: venue.website,
      lat: venue.lat,
      lng: venue.lng,
    };
  }

  // Transaction Management Methods
  async getTransactions(
    page = 1,
    limit = 25,
    search?: string,
    userId?: string,
    type?: TransactionType,
    status?: TransactionStatus,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.coinPackage', 'coinPackage');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR transaction.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (userId) {
      queryBuilder.andWhere('transaction.userId = :userId', { userId });
    }

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    // Apply sorting
    queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addCoinsToUser(userId: string, coinAmount: number, description?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Start transaction
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Add coins to user
      user.coins += coinAmount;
      await queryRunner.manager.save(user);

      // Record transaction
      const transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.REWARD,
        status: TransactionStatus.COMPLETED,
        coinAmount,
        description: description || `Admin granted ${coinAmount} coins`,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        newBalance: user.coins,
        transaction,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          coins: user.coins,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateUserCoins(userId: string, newCoinAmount: number, description?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const oldBalance = user.coins;
    const coinDifference = newCoinAmount - oldBalance;

    // Start transaction
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update user coins
      user.coins = newCoinAmount;
      await queryRunner.manager.save(user);

      // Record transaction
      const transaction = this.transactionRepository.create({
        userId,
        type: coinDifference >= 0 ? TransactionType.REWARD : TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        coinAmount: coinDifference,
        description:
          description ||
          `Admin set balance to ${newCoinAmount} coins (${coinDifference >= 0 ? '+' : ''}${coinDifference})`,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        oldBalance,
        newBalance: user.coins,
        coinDifference,
        transaction,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          coins: user.coins,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserWithTransactions(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const transactions = await this.transactionRepository.find({
      where: { userId },
      relations: ['coinPackage'],
      order: { createdAt: 'DESC' },
      take: 20, // Recent transactions
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        coins: user.coins,
        createdAt: user.createdAt,
        isActive: user.isActive,
      },
      transactions,
    };
  }

  async getTransactionStatistics() {
    const [
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      totalCoinsDistributed,
      totalCoinsSpent,
      coinPurchases,
      microphonePurchases,
    ] = await Promise.all([
      this.transactionRepository.count(),
      this.transactionRepository.count({ where: { status: TransactionStatus.COMPLETED } }),
      this.transactionRepository.count({ where: { status: TransactionStatus.PENDING } }),
      this.transactionRepository.count({ where: { status: TransactionStatus.FAILED } }),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(CASE WHEN coinAmount > 0 THEN coinAmount ELSE 0 END)', 'total')
        .where('status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne()
        .then((result) => parseInt(result.total) || 0),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(CASE WHEN coinAmount < 0 THEN ABS(coinAmount) ELSE 0 END)', 'total')
        .where('status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne()
        .then((result) => parseInt(result.total) || 0),
      this.transactionRepository.count({
        where: {
          type: TransactionType.COIN_PURCHASE,
          status: TransactionStatus.COMPLETED,
        },
      }),
      this.transactionRepository.count({
        where: {
          type: TransactionType.MICROPHONE_PURCHASE,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    return {
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      totalCoinsDistributed,
      totalCoinsSpent,
      coinPurchases,
      microphonePurchases,
    };
  }

  async searchUsers(searchTerm: string, all = false) {
    // If all is true, return all users for client-side fuzzy search
    if (all) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.name', 'user.email', 'user.coins', 'user.isActive'])
        .where('user.isActive = :isActive', { isActive: true })
        .orderBy('user.name', 'ASC')
        .limit(100) // Reasonable limit for client-side fuzzy search
        .getMany();

      return {
        success: true,
        data: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          coinBalance: user.coins || 0,
        })),
      };
    }

    if (!searchTerm || searchTerm.length < 2) {
      return {
        success: false,
        message: 'Search term must be at least 2 characters',
        data: [],
      };
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.coins', 'user.isActive'])
      .where('user.name ILIKE :search OR user.email ILIKE :search', {
        search: `%${searchTerm}%`,
      })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .orderBy('user.name', 'ASC')
      .limit(20)
      .getMany();

    return {
      success: true,
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        coinBalance: user.coins || 0,
      })),
    };
  }

  async addRewardToUser(userId: string, coinAmount: number, description?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Start transaction
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Add coins to user
      user.coins += coinAmount;
      await queryRunner.manager.save(user);

      // Record transaction as reward
      const transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.REWARD,
        status: TransactionStatus.COMPLETED,
        coinAmount,
        description: description || `Admin reward: ${coinAmount} coins`,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Successfully added ${coinAmount} reward coins to ${user.name}`,
        newBalance: user.coins,
        transaction,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          coins: user.coins,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        message: 'Failed to add reward coins',
        error: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
