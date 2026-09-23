import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Industry } from './entities/industry.entity';
import { Language } from './entities/language.entity';
import { Nationality } from './entities/nationality.entity';
import { Skill } from './entities/skill.entity';
import { Education } from './entities/education.entity';
import { GetAllDto } from './dto/get-all.dto';

@Injectable()
export class CommonService {
  constructor(
    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,

    @InjectRepository(Language)
    private languageRepo: Repository<Language>,

    @InjectRepository(Nationality)
    private nationalityRepo: Repository<Nationality>,

    @InjectRepository(Skill)
    private skillRepo: Repository<Skill>,

    @InjectRepository(Education)
    private educationRepo: Repository<Education>,
  ) {}

  private async buildQuery<T extends ObjectLiteral>(
    repo: Repository<T>,
    alias: string,
    query: GetAllDto,
  ) {
    const { page, limit, sortBy = 'id', order = 'ASC', search } = query;

    const qb = repo.createQueryBuilder(alias);

    // 🔎 Search by name
    if (search) {
      qb.andWhere(`LOWER(${alias}.name) LIKE :search`, {
        search: `%${search.toLowerCase()}%`,
      });
    }

    // 📊 Sorting
    qb.orderBy(`${alias}.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

    // 📑 Pagination
    let data;
    let total;
    if (page && limit) {
      qb.skip((+page - 1) * +limit).take(+limit);
      [data, total] = await qb.getManyAndCount();
    } else {
      data = await qb.getMany();
      total = data.length;
    }

    return {
      data,
      total,
      page: page ? +page : null,
      limit: limit ? +limit : null,
    };
  }

  getIndustries(query: GetAllDto) {
    return this.buildQuery(this.industryRepo, 'industry', query);
  }

  getLanguages(query: GetAllDto) {
    return this.buildQuery(this.languageRepo, 'language', query);
  }

  getNationalities(query: GetAllDto) {
    return this.buildQuery(this.nationalityRepo, 'nationality', query);
  }

  getSkills(query: GetAllDto) {
    return this.buildQuery(this.skillRepo, 'skill', query);
  }

  getEducations(query: GetAllDto) {
    return this.buildQuery(this.educationRepo, 'education', query);
  }
}
