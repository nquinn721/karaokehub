import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('urls_to_parse')
export class UrlToParse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, unique: true })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ type: 'boolean', default: false })
  hasBeenParsed: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
