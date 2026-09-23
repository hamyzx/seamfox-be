import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest } from './entities/interest.entity';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { GetAllInterestsDto } from './dto/get-all-interest.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { NotificationProvider } from '../notification/notification.provider';
import { PushNotificationDto } from '../notification/dto/pushNotification.dto';
import { UserProvider } from '../user/user.provider';
import { NotificationTypes } from '../lib/enums/notification.enum';
import { SendNotificationParams } from '../notification/notification.interface';
import { CandidateService } from '../candidate/candidate.service';
import { CompanyService } from '../company/company.service';
// import { Company } from '../company/entities/company.entity';
// import { Candidate } from '../candidate/entities/candidate.entity';

@Injectable()
export class InterestService {
  constructor(
    @InjectRepository(Interest)
    private readonly interestRepo: Repository<Interest>,
    private readonly userProvider: UserProvider,
    private readonly notificationProvider: NotificationProvider,
    private readonly candidateService: CandidateService,
    private readonly companyService: CompanyService,
  ) {}

  async create(createInterestDto: CreateInterestDto, senderId: string): Promise<Interest | any> {
    try {
      const { companyId, candidateId } = createInterestDto;
      const existingInterest = await this.interestRepo.findOne({
        where: { companyId, candidateId },
      });

      if (existingInterest) {
        await this.interestRepo.remove(existingInterest);
        return { message: 'Interest removed successfully' };
      }

      const interest = this.interestRepo.create({
        ...createInterestDto,
      });
      const interestResult = await this.interestRepo.save(interest);

      const sender = await this.userProvider.findOne(senderId);
      const senderCompany = await this.companyService.findOne(companyId);
      const receiver = await this.candidateService.findOne(candidateId);
      const senderName =
        [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') ||
        sender?.username ||
        'New message';

      const preview = { senderName, message: 'COmpany has shown his interest in your profile' };

      const deepLink = `'https://app.example.com/chat'}?c=${interestResult.id}`;
      const notification: PushNotificationDto = {
        title: 'New message',
        // body: JSON.stringify(preview),
        body: `${senderCompany.name ? senderCompany?.name : 'Company'} has shown his interest in your profile`,
      };

      const metadata = {
        interestId: interestResult.id,
        companyId,
        fromUserId: senderId,
        sender: {
          id: senderCompany.id,
          name: senderCompany.name,
          logo: senderCompany.logo,
          email: senderCompany.email,
          phoneNumber: senderCompany.phoneNumber,
        },
      };

      const params: SendNotificationParams = {
        recipientIds: [receiver.user.id],
        notification,
        dataPayload: {
          interestId: interestResult?.id.toString(),
          fromUserId: senderId,
          deepLink,
        },
        senderId,
        metadata,
        type: NotificationTypes.SHOW_INTEREST,
      };

      await this.notificationProvider.sendNotifications(params);

      return await this.interestRepo.save(interest);
    } catch (error) {
      handleDBError(error);
    }
  }

  async createJobInterest(
    createInterestDto: CreateInterestDto,
    senderId: string,
  ): Promise<Interest | any> {
    try {
      const { companyId, candidateId } = createInterestDto;
      const existingInterest = await this.interestRepo.findOne({
        where: { companyId, candidateId },
      });

      if (existingInterest) {
        await this.interestRepo.remove(existingInterest);
        return { message: 'Interest removed successfully' };
      }

      const interest = this.interestRepo.create({
        ...createInterestDto,
      });
      const interestResult = await this.interestRepo.save(interest);

      const sender = await this.userProvider.findOne(senderId);
      const receiver = await this.companyService.findOne(companyId);
      const senderName =
        [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') ||
        sender?.username ||
        'New message';

      const preview = { senderName, message: 'Company has shown his interest in your profile' };

      const deepLink = `'https://app.example.com/chat'}?c=${interestResult.id}`;
      const notification: PushNotificationDto = {
        title: 'New Interest',
        // body: JSON.stringify(preview),
        body: 'Candidate has shown his interest in your job',
      };

      const metadata = {
        interestId: interestResult.id,
        companyId,
        fromUserId: senderId,
      };

      const params: SendNotificationParams = {
        recipientIds: [receiver.user.id],
        notification,
        dataPayload: {
          interestId: interestResult?.id.toString(),
          fromUserId: senderId,
          deepLink,
        },
        senderId,
        metadata,
        type: NotificationTypes.SHOW_INTEREST,
      };

      await this.notificationProvider.sendNotifications(params);

      return await this.interestRepo.save(interest);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAll(query: GetAllInterestsDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', filters, search } = query;

      const qb = this.interestRepo
        .createQueryBuilder('interest')
        .leftJoinAndSelect('interest.company', 'company')
        .leftJoinAndSelect('interest.candidate', 'candidate')
        .select([
          'interest',
          'company.id',
          'company.name',
          'candidate.id',
          'candidate.firstName',
          'candidate.lastName',
        ]);

      // Search by candidate or company name or comment
      if (search) {
        qb.andWhere(
          `(
          LOWER(candidate.firstName) LIKE :search OR
          LOWER(candidate.lastName) LIKE :search OR
          LOWER(company.name) LIKE :search OR
        )`,
          { search: `%${search.toLowerCase()}%` },
        );
      }

      // 🎯 Filters (e.g. rating, companyId, candidateId, etc.)
      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`interest.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      // 📊 Sorting
      qb.orderBy(`interest.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

      // 📄 Pagination
      qb.skip((+page - 1) * +limit).take(+limit);

      // 🚀 Execute query
      const [data, total] = await qb.getManyAndCount();

      return {
        data,
        total,
        page: +page,
        limit: +limit,
      };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findOne(id: number): Promise<Interest> {
    const interest = await this.interestRepo.findOne({
      where: { id },
      relations: ['company', 'candidate'],
    });
    if (!interest) throw new NotFoundException(`Interest with ID ${id} not found`);
    return interest;
  }

  async update(id: number, updateInterestDto: UpdateInterestDto): Promise<Interest> {
    const { candidateId } = updateInterestDto; // extract the actual number
    const interest = await this.interestRepo.findOne({
      where: { id, candidateId },
    });
    if (!interest) throw new NotFoundException(`Interest has been removed by company!`);

    Object.assign(interest, updateInterestDto);
    return await this.interestRepo.save(interest);
  }

  async remove(id: number): Promise<void> {
    const result = await this.interestRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }
  }
}
