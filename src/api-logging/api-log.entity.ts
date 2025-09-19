import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ApiProvider {
  ITUNES = 'itunes',
}

export enum ApiLogType {
  SEARCH_SONGS = 'search_songs',
  SEARCH_ARTISTS = 'search_artists',
  SNIPPET_REQUEST = 'snippet_request',
  RATE_LIMITED = 'rate_limited',
  CIRCUIT_BREAKER = 'circuit_breaker',
  API_ERROR = 'api_error',
}

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

@Entity('api_logs')
@Index(['provider', 'timestamp'])
@Index(['logType', 'timestamp'])
@Index(['level', 'timestamp'])
export class ApiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ApiProvider,
  })
  provider: ApiProvider;

  @Column({
    type: 'enum',
    enum: ApiLogType,
  })
  logType: ApiLogType;

  @Column({
    type: 'enum',
    enum: LogLevel,
    default: LogLevel.INFO,
  })
  level: LogLevel;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  requestData: any;

  @Column({ type: 'json', nullable: true })
  responseData: any;

  @Column({ type: 'json', nullable: true })
  errorDetails: any;

  @Column({ type: 'int', nullable: true })
  statusCode: number;

  @Column({ type: 'int', nullable: true })
  responseTime: number; // in milliseconds

  @Column({ type: 'varchar', length: 500, nullable: true })
  query: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  // Rate limiting specific fields
  @Column({ type: 'int', nullable: true })
  rateLimitRemaining: number;

  @Column({ type: 'timestamp', nullable: true })
  rateLimitReset: Date;

  @Column({ type: 'boolean', default: false })
  wasRateLimited: boolean;

  @Column({ type: 'boolean', default: false })
  circuitBreakerTripped: boolean;

  @CreateDateColumn()
  timestamp: Date;
}
