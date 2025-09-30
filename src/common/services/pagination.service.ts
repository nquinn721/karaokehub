import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  PaginationOptions,
  PaginationResult,
  QueryOptions,
} from '../interfaces/pagination.interface';

export class PaginationService {
  /**
   * Apply pagination to a query builder
   */
  static applyPagination<T>(
    query: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): SelectQueryBuilder<T> {
    const { page = 1, limit = 10 } = options;
    return query.skip((page - 1) * limit).take(limit);
  }

  /**
   * Apply search conditions to a query builder
   */
  static applySearch<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    searchFields: string[],
    search?: string,
  ): SelectQueryBuilder<T> {
    if (search && searchFields.length > 0) {
      const conditions = searchFields.map((field) => `${alias}.${field} LIKE :search`).join(' OR ');
      query.where(`(${conditions})`, { search: `%${search}%` });
    }
    return query;
  }

  /**
   * Apply sorting to a query builder
   */
  static applySorting<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    options: PaginationOptions,
    queryOptions: QueryOptions,
  ): SelectQueryBuilder<T> {
    const { sortBy, sortOrder = 'ASC' } = options;
    const { sortMappings = {}, defaultSort = `${alias}.createdAt` } = queryOptions;

    if (sortBy && sortMappings[sortBy]) {
      query.orderBy(sortMappings[sortBy], sortOrder);
    } else if (sortBy) {
      // Fallback to direct field mapping with alias
      query.orderBy(`${alias}.${sortBy}`, sortOrder);
    } else {
      query.orderBy(defaultSort, 'DESC');
    }

    return query;
  }

  /**
   * Apply relations to a query builder
   */
  static applyRelations<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    relations: string[],
  ): SelectQueryBuilder<T> {
    relations.forEach((relation) => {
      const relationAlias = relation.split('.').pop() || relation;
      query.leftJoinAndSelect(`${alias}.${relation}`, relationAlias);
    });
    return query;
  }

  /**
   * Execute paginated query and return formatted result
   */
  static async executePaginatedQuery<T>(
    query: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 10 } = options;
    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Complete paginated query with all common options applied
   */
  static async paginate<T>(
    repository: Repository<T>,
    alias: string,
    options: PaginationOptions = {},
    queryOptions: QueryOptions = {},
  ): Promise<PaginationResult<T>> {
    const {
      searchFields = [],
      relations = [],
      sortMappings = {},
      defaultSort = `${alias}.createdAt`,
    } = queryOptions;

    let query = repository.createQueryBuilder(alias);

    // Apply relations
    if (relations.length > 0) {
      query = this.applyRelations(query, alias, relations);
    }

    // Apply search
    if (options.search && searchFields.length > 0) {
      query = this.applySearch(query, alias, searchFields, options.search);
    }

    // Apply sorting
    query = this.applySorting(query, alias, options, { sortMappings, defaultSort });

    // Apply pagination
    query = this.applyPagination(query, options);

    // Execute and return result
    return this.executePaginatedQuery(query, options);
  }
}
