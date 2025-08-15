import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dj_nicknames')
export class DJNickname {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  djId: string;

  @Column()
  nickname: string;

  @Column({
    type: 'enum',
    enum: ['stage_name', 'alias', 'social_handle', 'real_name'],
    default: 'alias',
  })
  type: 'stage_name' | 'alias' | 'social_handle' | 'real_name';

  @Column({ nullable: true })
  platform: string; // e.g., 'facebook', 'instagram', 'twitter', etc.

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne('DJ', (dj: any) => dj.nicknames)
  @JoinColumn({ name: 'djId' })
  dj: any;
}
