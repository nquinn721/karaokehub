import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApiIssueType {
  ERROR = 'error',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  CIRCUIT_BREAKER = 'circuit_breaker',
  INVALID_RESPONSE = 'invalid_response',
}

export enum ApiProvider {
  ITUNES = 'itunes',
  SPOTIFY = 'spotify',
  YOUTUBE = 'youtube',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  GEMINI = 'gemini',
}

export enum ApiEndpointType {
  SEARCH = 'search',
  DETAIL = 'detail',
  IMAGE_GENERATION = 'image_generation',
  AUTHENTICATION = 'authentication',
  SOCIAL_POST = 'social_post',
  OTHER = 'other',
}

@Entity('api_issues')
@Index(['provider', 'issueType', 'isResolved'])
@Index(['createdAt'])
export class ApiIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', precision: 6 })
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: ApiProvider,
  })
  provider: ApiProvider;

  @Column({
    type: 'enum',
    enum: ApiEndpointType,
  })
  endpointType: ApiEndpointType;

  @Column({
    type: 'enum',
    enum: ApiIssueType,
  })
  issueType: ApiIssueType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorCode: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  requestDetails: any; // Store request URL, headers, body

  @Column({ type: 'json', nullable: true })
  responseDetails: any; // Store response status, headers, body

  @Column({ type: 'int', nullable: true })
  responseTime: number; // milliseconds

  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ type: 'timestamp', precision: 6, nullable: true })
  resolvedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resolvedBy: string; // admin user who marked as resolved

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 6 })
  updatedAt: Date;
}
