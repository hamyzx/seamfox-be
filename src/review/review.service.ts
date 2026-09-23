import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetAllReviewsDto } from './dto/get-all-reviews.dto';
import { handleDBError } from '../lib/error/dataBaseError';
// import { Company } from '../company/entities/company.entity';
// import { Candidate } from '../candidate/entities/candidate.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,

    // @InjectRepository(Company)
    // private readonly companyRepo: Repository<Company>,

    // @InjectRepository(Candidate)
    // private readonly candidateRepo: Repository<Candidate>,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review | any> {
    try {
      const { companyId, candidateId } = createReviewDto; // adjust keys based on your DTO
      const existingReview = await this.reviewRepo.findOne({
        where: { companyId, candidateId },
      });

      if (existingReview) {
        // Step 2: If exists → remove (toggle off)
        await this.reviewRepo.remove(existingReview);
        return { message: 'Review removed successfully' };
      }

      const review = this.reviewRepo.create({
        ...createReviewDto,
      });
      return await this.reviewRepo.save(review);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAll(query: GetAllReviewsDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', filters, search } = query;

      const qb = this.reviewRepo
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.company', 'company')
        .leftJoinAndSelect('review.candidate', 'candidate')
        .select([
          'review',
          'company.id',
          'company.name',
          'candidate.id',
          'candidate.firstName',
          'candidate.lastName',
        ]);

      // 🔍 Search by candidate or company name or comment
      if (search) {
        qb.andWhere(
          `(
          LOWER(candidate.firstName) LIKE :search OR
          LOWER(candidate.lastName) LIKE :search OR
          LOWER(company.name) LIKE :search OR
          LOWER(review.comment) LIKE :search
        )`,
          { search: `%${search.toLowerCase()}%` },
        );
      }

      // 🎯 Filters (e.g. rating, companyId, candidateId, etc.)
      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`review.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      // 📊 Sorting
      qb.orderBy(`review.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

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

  async findOne(id: number): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['company', 'candidate'],
    });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found`);
    return review;
  }

  async update(id: number, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found`);

    Object.assign(review, updateReviewDto);
    return await this.reviewRepo.save(review);
  }

  async remove(id: number): Promise<void> {
    const result = await this.reviewRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
  }
}
