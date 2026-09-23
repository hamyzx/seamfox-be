import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Poll } from './poll.entity';
import { PollVote } from './poll-vote.entity';

@Entity('poll_options')
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @Column({ type: 'varchar', length: 80 })
  text: string;

  @Column()
  displayOrder: number;

  @Column({ default: 0 })
  voteCount: number;

  @OneToMany(() => PollVote, (vote) => vote.option)
  votes: PollVote[];

  @CreateDateColumn()
  createdAt: Date;
}