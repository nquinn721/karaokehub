import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { Favorite } from '../favorite/favorite.entity';
import { ParsedSchedule, ParseStatus } from '../parser/parsed-schedule.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
  ) {}

  async getStatistics() {
    const [
      totalUsers,
      activeUsers,
      totalVendors,
      totalShows,
      activeShows,
      totalDJs,
      totalFavorites,
      pendingReviews,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.vendorRepository.count(),
      this.showRepository.count(),
      this.showRepository.count({ where: { isActive: true } }),
      this.djRepository.count(),
      this.favoriteRepository.count(),
      this.parsedScheduleRepository.count({ where: { status: ParseStatus.PENDING_REVIEW } }),
    ]);

    // Get growth statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newUsersLast30Days, newVendorsLast30Days, newShowsLast30Days] = await Promise.all([
      this.userRepository.count({ where: { createdAt: { $gte: thirtyDaysAgo } as any } }),
      this.vendorRepository.count({ where: { createdAt: { $gte: thirtyDaysAgo } as any } }),
      this.showRepository.count({ where: { createdAt: { $gte: thirtyDaysAgo } as any } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalVendors,
      totalShows,
      activeShows,
      totalDJs,
      totalFavorites,
      pendingReviews,
      growth: {
        newUsersLast30Days,
        newVendorsLast30Days,
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
      relations: ['vendor', 'dj'],
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
        details: `${show.vendor?.name || 'Unknown Venue'} - ${show.day || 'No day specified'}`,
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
  async getUsers(page = 1, limit = 10, search?: string) {
    const query = this.userRepository.createQueryBuilder('user');

    if (search) {
      query.where('user.name LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('user.createdAt', 'DESC')
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

  async getVenues(page = 1, limit = 10, search?: string) {
    const query = this.vendorRepository.createQueryBuilder('vendor');

    if (search) {
      query.where('vendor.name LIKE :search OR vendor.location LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('vendor.createdAt', 'DESC')
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

  async getShows(page = 1, limit = 10, search?: string) {
    const query = this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.vendor', 'vendor')
      .leftJoinAndSelect('show.dj', 'dj');

    if (search) {
      query.where('vendor.name LIKE :search OR show.day LIKE :search OR dj.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('show.createdAt', 'DESC')
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

  async getDjs(page = 1, limit = 10, search?: string) {
    const query = this.djRepository.createQueryBuilder('dj');

    if (search) {
      query.where('dj.name LIKE :search OR dj.bio LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('dj.createdAt', 'DESC')
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
    const query = this.favoriteRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.user', 'user')
      .leftJoinAndSelect('favorite.show', 'show')
      .leftJoinAndSelect('show.vendor', 'vendor');

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
}
