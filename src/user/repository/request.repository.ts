import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDTO } from '../../lib/dto/pagination.dto';
import { UserRequest } from '../entities/request.entity';
import { RequestStatus, RequestType } from '../../lib/enums/request.enum';
@Injectable()
export class RequestRepository {
  constructor(
    @InjectRepository(UserRequest)
    private readonly requestRepository: Repository<UserRequest>,
  ) {}
  async findFriendRequests(userId: string, qParams: PaginationDTO) {
    const { page = 1, limit = 3, search } = qParams;

    const query = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .where('request.targetUserId = :userId', { userId })
      .andWhere('request.requestType = :type', { type: RequestType.FRIEND })
      .andWhere('request.status = :status', { status: RequestStatus.PENDING });

    if (search) {
      query.andWhere(
        `(requester.firstName ILIKE :search OR requester.lastName ILIKE :search OR requester.username ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    return query
      .orderBy('request.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findFollowRequests(userId: string, qParams: PaginationDTO) {
    const { page = 1, limit = 3, search } = qParams;

    const query = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .where('request.targetUserId = :userId', { userId })
      .andWhere('request.requestType = :type', { type: RequestType.FOLLOW })
      .andWhere('request.status = :status', { status: RequestStatus.PENDING });

    if (search) {
      query.andWhere(
        `(requester.firstName ILIKE :search OR requester.lastName ILIKE :search OR requester.username ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    return query
      .orderBy('request.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async sendFriendRequest(requesterId: string, targetUserId: string) {
    const request = this.requestRepository.create({
      requesterId,
      targetUserId,
      requestType: RequestType.FRIEND,
    });
    return this.requestRepository.save(request);
  }

  async sendFollowRequest(requesterId: string, targetUserId: string) {
    const request = this.requestRepository.create({
      requesterId,
      targetUserId,
      requestType: RequestType.FOLLOW,
    });
    return this.requestRepository.save(request);
  }

  async updateRequestStatus(requestId: string, response: RequestStatus) {
    return this.requestRepository.update({ id: requestId }, { status: response });
  }

  async findOneFriendRequest(id: string) {
    return this.requestRepository.findOne({
      where: {
        id,
        status: RequestStatus.PENDING,
        requestType: RequestType.FRIEND,
      },
    });
  }

  async findOneFollowRequest(id: string) {
    return this.requestRepository.findOne({
      where: {
        id,
        status: RequestStatus.PENDING,
        requestType: RequestType.FOLLOW,
      },
    });
  }

  async findOneFriendRequestByRequesterAndTargetUser(requesterId: string, targetUserId: string) {
    return this.requestRepository.findOne({
      where: {
        requesterId,
        targetUserId,
        status: RequestStatus.PENDING,
        requestType: RequestType.FRIEND,
      },
    });
  }

  async findOneFollowRequestByRequesterAndTargetUser(requesterId: string, targetUserId: string) {
    return this.requestRepository.findOne({
      where: {
        requesterId,
        targetUserId,
        status: RequestStatus.PENDING,
        requestType: RequestType.FOLLOW,
      },
    });
  }
}
