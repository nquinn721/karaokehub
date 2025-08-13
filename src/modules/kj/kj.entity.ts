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
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

@Entity('kjs')
export class KJ {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('uuid')
  vendorId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Vendor, (vendor) => vendor.kjs)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @OneToMany(() => Show, (show) => show.kj)
  shows: Show[];
}
