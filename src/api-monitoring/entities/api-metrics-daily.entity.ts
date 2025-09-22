import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApiProvider {
  ITUNES = 'itunes',
}

export enum ApiEndpointType {
  SEARCH = 'search',
}

@Entity('api_metrics_daily')
@Index(['date', 'provider', 'endpointType'])
export class ApiMetricsDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD format

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

  @Column({ type: 'int', default: 0 })
  totalCalls: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'int', default: 0 })
  rateLimitHits: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  avgResponseTime: number; // milliseconds

  @Column({ type: 'int', default: 0 })
  minResponseTime: number; // milliseconds

  @Column({ type: 'int', default: 0 })
  maxResponseTime: number; // milliseconds

  @Column({ type: 'bigint', default: 0 })
  totalResponseTime: number; // for calculating avg

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
