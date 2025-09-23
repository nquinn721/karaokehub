import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('api_recent_calls')
@Index(['provider', 'timestamp'])
@Index(['timestamp'])
export class ApiRecentCall {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['itunes', 'spotify', 'youtube', 'google', 'facebook', 'twitter', 'gemini'],
  })
  provider: string;

  @Column({
    type: 'enum',
    enum: ['search', 'detail', 'image_generation', 'authentication', 'social_post', 'other'],
    name: 'endpoint_type',
  })
  endpointType: string;

  @Column({ name: 'status_code' })
  statusCode: number;

  @Column({ name: 'response_time_ms' })
  responseTimeMs: number;

  @Column()
  success: boolean;

  @Column({ name: 'rate_limited', default: false })
  rateLimited: boolean;

  @Column({ name: 'error_type', nullable: true })
  errorType?: string;

  @Column({ name: 'search_query', nullable: true, length: 500 })
  searchQuery?: string;

  @Column({ name: 'request_url', nullable: true, length: 1000 })
  requestUrl?: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  timestamp: Date;
}
