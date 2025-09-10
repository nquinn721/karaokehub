import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

@Entity('djs')
export class DJ {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('uuid')
  vendorId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  submittedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submittedBy' })
  submittedByUser: User;

  @ManyToOne(() => Vendor, (vendor) => vendor.djs)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @OneToMany(() => Show, (show) => show.dj)
  shows: Show[];
}
