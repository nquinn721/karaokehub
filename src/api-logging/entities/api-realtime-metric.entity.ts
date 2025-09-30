import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('api_realtime_metrics')
@Index(['provider'])
@Index(['minuteTimestamp'])
export class ApiRealtimeMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['itunes', 'spotify', 'youtube', 'google', 'facebook', 'twitter', 'gemini'],
  })
  provider: string;

  @Column({ name: 'minute_timestamp', type: 'datetime' })
  minuteTimestamp: Date;

  @Column({ name: 'total_requests', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', default: 0 })
  failedRequests: number;

  @Column({ name: 'rate_limited_requests', default: 0 })
  rateLimitedRequests: number;

  @Column({ name: 'total_response_time_ms', type: 'bigint', default: 0 })
  totalResponseTimeMs: number;

  @Column({ name: 'min_response_time_ms', nullable: true })
  minResponseTimeMs?: number;

  @Column({ name: 'max_response_time_ms', nullable: true })
  maxResponseTimeMs?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 6 })
  updatedAt: Date;

  // Computed property for average response time
  get averageResponseTimeMs(): number {
    return this.totalRequests > 0 ? this.totalResponseTimeMs / this.totalRequests : 0;
  }

  // Computed property for success rate
  get successRate(): number {
    return this.totalRequests > 0 ? (this.successfulRequests / this.totalRequests) * 100 : 100;
  }
}
