import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { Outfit } from './outfit.entity';

@Entity('user_outfits')
export class UserOutfit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  outfitId: string;

  @Column({ default: false })
  isEquipped: boolean;

  @CreateDateColumn()
  acquiredAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Outfit)
  @JoinColumn({ name: 'outfitId' })
  outfit: Outfit;
}
