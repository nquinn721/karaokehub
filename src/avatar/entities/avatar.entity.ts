import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserAvatar } from './user-avatar.entity';

@Entity('avatars')
export class Avatar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, default: 'basic' })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'common' })
  rarity: string;

  @Column({ type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  coinPrice: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: true })
  isFree: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => UserAvatar, (userAvatar) => userAvatar.avatar)
  userAvatars: UserAvatar[];
}
