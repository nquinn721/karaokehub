import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_rate_limit_status')
export class ApiRateLimitStatus {
  @PrimaryColumn({
    type: 'enum',
    enum: ['itunes', 'spotify', 'youtube', 'google', 'facebook', 'twitter', 'gemini'],
  })
  provider: string;

  @Column({ name: 'max_requests_per_minute', default: 300 })
  maxRequestsPerMinute: number;

  @Column({ name: 'current_minute_count', default: 0 })
  currentMinuteCount: number;

  @Column({ name: 'current_minute_start', type: 'datetime', nullable: true })
  currentMinuteStart?: Date;

  @Column({ name: 'is_rate_limited', default: false })
  isRateLimited: boolean;

  @Column({ name: 'circuit_breaker_open', default: false })
  circuitBreakerOpen: boolean;

  @Column({ name: 'last_request_at', type: 'timestamp', precision: 6, nullable: true })
  lastRequestAt?: Date;

  @Column({ name: 'last_success_at', type: 'timestamp', precision: 6, nullable: true })
  lastSuccessAt?: Date;

  @Column({ name: 'last_error_at', type: 'timestamp', precision: 6, nullable: true })
  lastErrorAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 6 })
  updatedAt: Date;

  // Computed properties for dashboard
  get remainingRequests(): number {
    return Math.max(0, this.maxRequestsPerMinute - this.currentMinuteCount);
  }

  get usagePercentage(): number {
    return (this.currentMinuteCount / this.maxRequestsPerMinute) * 100;
  }

  get isHealthy(): boolean {
    return !this.isRateLimited && !this.circuitBreakerOpen;
  }
}
