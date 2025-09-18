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
import { Shoes } from './shoes.entity';

@Entity('user_shoes')
export class UserShoes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  shoesId: string;

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

  @ManyToOne(() => Shoes)
  @JoinColumn({ name: 'shoesId' })
  shoes: Shoes;
}
