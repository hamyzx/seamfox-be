import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../application/entities/application.entity';
import { JobApplicationComment } from './entities/job_application_comments.entity';

@Injectable()
export class ApplicationCommentService {
  constructor(
    @InjectRepository(JobApplicationComment)
    private readonly commentRepo: Repository<JobApplicationComment>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
  ) {}

  async addComment(applicationId: number, comment: string, createdBy?: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application #${applicationId} not found`);
    }

    const newComment = this.commentRepo.create({
      applicationId,
      comment,
      createdBy,
    });

    return this.commentRepo.save(newComment);
  }

  async getComments(applicationId: number) {
    return this.commentRepo.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }
}
