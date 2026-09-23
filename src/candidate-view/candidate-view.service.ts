import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateView } from './entities/candidate-view.entity';
import { CreateCandidateViewDto } from './dto/create-candidate-view.dto';
import { Candidate } from '../candidate/entities/candidate.entity';
import { NotificationProvider } from '../notification/notification.provider';
import { PushNotificationDto } from '../notification/dto/pushNotification.dto';
import { NotificationTypes } from '../lib/enums/notification.enum';
import { Company } from '../company/entities/company.entity';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class CandidateViewService {
  constructor(
    @InjectRepository(CandidateView)
    private repo: Repository<CandidateView>,
    @InjectRepository(Candidate)
    private candidateRepo: Repository<Candidate>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationProvider: NotificationProvider,
  ) {}

  async create(dto: CreateCandidateViewDto, senderId: string) {
    // Fetch candidate.user.id for notification
    const candidate = await this.candidateRepo.findOne({
      where: { id: dto.candidateId },
      relations: ['user'],
    });

    if (!candidate) throw new NotFoundException('Candidate not found');

    const checkChatAcess = await this.subscriptionService.getFeatureLimit(candidate.user.id, 14);

    if (!checkChatAcess) {
      throw new BadRequestException('This candidate cannot profile notify alerts!');
    }

    // Fetch candidate.user.id for notification
    const company = await this.companyRepo.findOne({
      where: { id: dto.companyId },
      relations: ['user'],
    });

    if (!company) throw new NotFoundException('Company not found');

    // Save view activity
    const record = this.repo.create({
      companyId: dto.companyId,
      candidateId: dto.candidateId,
    });

    await this.repo.save(record);

    const recipientId = candidate.user.id; // UUID of candidate user

    // -----------------------------
    // SEND NOTIFICATION
    // -----------------------------
    const notification: PushNotificationDto = {
      title: `${company.name} has viewed your profile`,
      body: 'A company viewed your profile',
    };

    await this.notificationProvider.sendNotifications({
      recipientIds: [recipientId],
      notification,
      dataPayload: {
        candidateId: dto.candidateId.toString(),
      },
      senderId,
      metadata: {
        candidateId: dto.candidateId,
        companyId: dto.companyId,
      },
      type: NotificationTypes.PROFILE_VIEW,
      senderName: 'Company',
    });

    return {
      message: 'Candidate view recorded & notification sent',
      data: record,
    };
  }

  async findAll() {
    return this.repo.find({
      relations: ['candidate', 'company'],
    });
  }
}
