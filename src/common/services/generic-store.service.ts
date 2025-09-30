import { Repository } from 'typeorm';
import { PaginationOptions, PaginationResult } from '../interfaces/pagination.interface';

/**
 * Configuration for generic store item queries
 */
export interface StoreItemConfig {
  searchFields: string[];
  defaultLimit?: number;
  filterConditions?: any;
  orderBy?: { [key: string]: 'ASC' | 'DESC' };
}

/**
 * Generic service for store-related CRUD operations
 */
export class GenericStoreService {
  /**
   * Generic paginated query for store items with search
   */
  static async getStoreItems<T>(
    repository: Repository<T>,
    alias: string,
    options: PaginationOptions,
    config: StoreItemConfig,
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = config.defaultLimit || 50, search } = options;

    const queryBuilder = repository.createQueryBuilder(alias);

    // Apply search if provided
    if (search && config.searchFields.length > 0) {
      const searchConditions = config.searchFields
        .map((field) => `${alias}.${field} LIKE :search`)
        .join(' OR ');

      queryBuilder.where(`(${searchConditions})`, { search: `%${search}%` });
    }

    // Apply filter conditions
    if (config.filterConditions) {
      Object.entries(config.filterConditions).forEach(([key, value]) => {
        if (search) {
          queryBuilder.andWhere(`${alias}.${key} = :${key}`, { [key]: value });
        } else {
          queryBuilder.where(`${alias}.${key} = :${key}`, { [key]: value });
        }
      });
    }

    // Apply ordering
    if (config.orderBy) {
      Object.entries(config.orderBy).forEach(([field, direction], index) => {
        if (index === 0) {
          queryBuilder.orderBy(`${alias}.${field}`, direction);
        } else {
          queryBuilder.addOrderBy(`${alias}.${field}`, direction);
        }
      });
    } else {
      queryBuilder.orderBy(`${alias}.createdAt`, 'DESC');
    }

    // Apply pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Generic method to get store items without pagination (for public store)
   */
  static async getPublicStoreItems<T>(
    repository: Repository<T>,
    config: {
      filterConditions?: any;
      orderBy?: { [key: string]: 'ASC' | 'DESC' };
      relations?: string[];
    } = {},
  ): Promise<T[]> {
    const queryOptions: any = {};

    if (config.filterConditions) {
      queryOptions.where = config.filterConditions;
    }

    if (config.orderBy) {
      queryOptions.order = config.orderBy;
    }

    if (config.relations) {
      queryOptions.relations = config.relations;
    }

    return repository.find(queryOptions);
  }
}
