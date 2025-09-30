export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryOptions {
  searchFields?: string[];
  relations?: string[];
  sortMappings?: { [key: string]: string };
  defaultSort?: string;
}
