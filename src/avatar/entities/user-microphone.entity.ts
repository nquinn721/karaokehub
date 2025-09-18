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
import { Microphone } from './microphone.entity';

@Entity('user_microphones')
export class UserMicrophone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  microphoneId: string;

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

  @ManyToOne(() => Microphone)
  @JoinColumn({ name: 'microphoneId' })
  microphone: Microphone;
}
