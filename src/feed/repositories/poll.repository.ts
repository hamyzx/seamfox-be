import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Poll } from '../entities/poll.entity';
import { PollOption } from '../entities/poll-option.entity';
import { PollVote } from '../entities/poll-vote.entity';
import { Post } from '../entities/post.entity';
import { CreatePollDto } from '../dto/createPoll.dto';

@Injectable()
export class PollRepository {
  constructor(
    @InjectRepository(Poll)
    private readonly pollRepo: Repository<Poll>,
    @InjectRepository(PollOption)
    private readonly optionRepo: Repository<PollOption>,
    @InjectRepository(PollVote)
    private readonly voteRepo: Repository<PollVote>,
    private readonly dataSource: DataSource,
  ) {}

  async createPollForPost(post: Post, payload: CreatePollDto): Promise<Poll> {
    const expiresAt = payload.durationDays
      ? new Date(Date.now() + payload.durationDays * 24 * 60 * 60 * 1000)
      : null;

    const poll = this.pollRepo.create({
      post,
      question: payload.question,
      expiresAt,
      totalVotes: 0,
    });

    const savedPoll = await this.pollRepo.save(poll);

    const options = payload.options.map((opt, idx) =>
      this.optionRepo.create({
        poll: savedPoll,
        text: opt.text,
        displayOrder: idx,
        voteCount: 0,
      }),
    );

    savedPoll.options = await this.optionRepo.save(options);
    return savedPoll;
  }

  async findByPostId(postId: string): Promise<Poll | null> {
    return this.pollRepo.findOne({
      where: { post: { id: postId } },
      relations: { options: true },
      order: { options: { displayOrder: 'ASC' } } as any,
    });
  }

  async findUserVote(pollId: string, userId: string): Promise<PollVote | null> {
    return this.voteRepo.findOne({
      where: { poll: { id: pollId }, user: { id: userId } },
      relations: { option: true },
    });
  }

  async castVote(pollId: string, optionId: string, userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Insert vote
      await manager.query(
        `INSERT INTO poll_votes (id, "pollId", "optionId", "userId", "createdAt")
         VALUES (uuid_generate_v4(), $1, $2, $3, NOW())`,
        [pollId, optionId, userId],
      );

      // Increment counters
      await manager.query(
        `UPDATE poll_options SET "voteCount" = "voteCount" + 1 WHERE id = $1`,
        [optionId],
      );

      await manager.query(
        `UPDATE polls SET "totalVotes" = "totalVotes" + 1 WHERE id = $1`,
        [pollId],
      );
    });
  }

  async removeVote(pollId: string, userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const vote = await manager.findOne(PollVote, {
        where: { poll: { id: pollId }, user: { id: userId } },
        relations: { option: true },
      });

      if (!vote) return;

      await manager.delete(PollVote, { id: vote.id });

      await manager.query(
        `UPDATE poll_options SET "voteCount" = GREATEST("voteCount" - 1, 0) WHERE id = $1`,
        [vote.option.id],
      );

      await manager.query(
        `UPDATE polls SET "totalVotes" = GREATEST("totalVotes" - 1, 0) WHERE id = $1`,
        [pollId],
      );
    });
  }
}