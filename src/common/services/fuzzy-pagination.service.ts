import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  PaginationOptions,
  PaginationResult,
  QueryOptions,
} from '../interfaces/pagination.interface';
import { FuzzySearchService } from './fuzzy-search.service';

export interface FuzzySearchQueryOptions extends QueryOptions {
  fuzzyFields?: string[]; // Fields to use for fuzzy matching
  enableFuzzySearch?: boolean; // Whether to enable fuzzy search
  fuzzyThreshold?: number; // Fuzzy search threshold (0-1)
}

@Injectable()
export class FuzzyPaginationService {
  constructor(private fuzzySearchService: FuzzySearchService) {}

  /**
   * Apply fuzzy search conditions to a query builder
   */
  applyFuzzySearch<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    searchFields: string[],
    search?: string,
  ): SelectQueryBuilder<T> {
    if (!search || searchFields.length === 0) {
      return query;
    }

    // Create SQL patterns for fuzzy matching
    const patterns = this.fuzzySearchService.createSqlPatterns(search);
    
    if (patterns.length === 0) {
      return query;
    }

    // Build OR conditions for all field-pattern combinations
    const conditions: string[] = [];
    const parameters: any = {};

    searchFields.forEach((field, fieldIndex) => {
      patterns.forEach((pattern, patternIndex) => {
        const paramName = `search_${fieldIndex}_${patternIndex}`;
        conditions.push(`${alias}.${field} LIKE :${paramName}`);
        parameters[paramName] = pattern;
      });
    });

    if (conditions.length > 0) {
      query.andWhere(`(${conditions.join(' OR ')})`, parameters);
    }

    return query;
  }

  /**
   * Apply regular LIKE search conditions (fallback)
   */
  applyRegularSearch<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    searchFields: string[],
    search?: string,
  ): SelectQueryBuilder<T> {
    if (search && searchFields.length > 0) {
      const conditions = searchFields.map((field) => `${alias}.${field} LIKE :search`).join(' OR ');
      query.andWhere(`(${conditions})`, { search: `%${search}%` });
    }
    return query;
  }

  /**
   * Apply sorting to a query builder
   */
  applySorting<T>(
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
  applyRelations<T>(
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
   * Apply pagination to a query builder
   */
  applyPagination<T>(
    query: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): SelectQueryBuilder<T> {
    const { page = 1, limit = 10 } = options;
    return query.skip((page - 1) * limit).take(limit);
  }

  /**
   * Execute paginated query and return formatted result
   */
  async executePaginatedQuery<T>(
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
   * Complete paginated query with fuzzy search support
   */
  async paginateWithFuzzySearch<T>(
    repository: Repository<T>,
    alias: string,
    options: PaginationOptions = {},
    queryOptions: FuzzySearchQueryOptions = {},
  ): Promise<PaginationResult<T>> {
    const {
      searchFields = [],
      fuzzyFields = searchFields,
      relations = [],
      sortMappings = {},
      defaultSort = `${alias}.createdAt`,
      enableFuzzySearch = true,
      fuzzyThreshold = 0.6,
    } = queryOptions;

    let query = repository.createQueryBuilder(alias);

    // Apply relations
    if (relations.length > 0) {
      query = this.applyRelations(query, alias, relations);
    }

    // Apply search (fuzzy or regular)
    if (options.search && searchFields.length > 0) {
      if (enableFuzzySearch && fuzzyFields.length > 0) {
        query = this.applyFuzzySearch(query, alias, fuzzyFields, options.search);
      } else {
        query = this.applyRegularSearch(query, alias, searchFields, options.search);
      }
    }

    // Apply sorting
    query = this.applySorting(query, alias, options, { sortMappings, defaultSort });

    // Apply pagination
    query = this.applyPagination(query, options);

    // Execute and return result
    return this.executePaginatedQuery(query, options);
  }
}