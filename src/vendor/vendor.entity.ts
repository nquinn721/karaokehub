import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  owner: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ default: true })
  isActive: boolean;

  // New fields for parser system
  @Column({ default: false })
  requiresReview: boolean;

  @Column({ nullable: true })
  lastParsed: Date;

  @Column({ nullable: true, type: 'text' })
  parseNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => DJ, (dj) => dj.vendor)
  djs: DJ[];

  @OneToMany(() => ParsedSchedule, (parsedSchedule) => parsedSchedule.vendor)
  parsedSchedules: ParsedSchedule[];
}
