// src/seeder/seeder.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { KanbanBoardCoreStatus } from '../../company/kanban-board/entities/kanban-board-core-status.entity';
import { Nationality } from '../../common/entities/nationality.entity';
import { Language } from '../../common/entities/language.entity';
import { Skill } from '../../common/entities/skill.entity';
import { Education } from '../../common/entities/education.entity';
import { BlogCategory } from '../../blog/entities/blog-category.entity';
import { Feature } from '../../subscription/entities/feature.entity';
import { industries } from '../constants/industries';
import { boardCoreStatuses } from '../constants/boardCoreStatuses';
import { nationalities } from '../constants/nationalities';
import { languages } from '../constants/languages';
import { skills } from '../constants/skills';
import { blogCategories } from '../constants/blogCategories';
import { features } from '../constants/features';
import { educations } from '../constants/education';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,
    @InjectRepository(KanbanBoardCoreStatus)
    private KanbanBoardCoreStatusRepo: Repository<KanbanBoardCoreStatus>,
    @InjectRepository(Nationality)
    private nationalityRepo: Repository<Nationality>,
    @InjectRepository(Language)
    private languageRepo: Repository<Language>,
    @InjectRepository(Skill)
    private skillRepo: Repository<Skill>,
    @InjectRepository(BlogCategory)
    private blogCategoryRepo: Repository<BlogCategory>,
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
    @InjectRepository(Education)
    private educationepo: Repository<Education>,
  ) {}

  async onModuleInit() {
    // await this.seedIndustries();
    await this.seedKanbanboardCoreStatus();
    await this.seedNationalities();
    await this.seedLanguages();
    await this.seedSkills();
    await this.seedBlogCategories();
    await this.seedFeatures();
    await this.seedEducations();
  }

  private async seedIndustries() {
    for (const item of industries) {
      const exists = await this.industryRepo.findOne({
        where: { name: item.name, function: item.function },
      });
      if (!exists) {
        await this.industryRepo.save(this.industryRepo.create(item));
      }
    }
    console.log(`✅ Industries seeded: ${industries.length} unique pairs`);
  }

  private async seedNationalities() {
    await Promise.all(nationalities.map((name) => this.nationalityRepo.upsert({ name }, ['name'])));
  }

  private async seedKanbanboardCoreStatus() {
    await Promise.all(
      boardCoreStatuses.map((item) => this.KanbanBoardCoreStatusRepo.upsert(item, ['name'])),
    );
  }

  private async seedLanguages() {
    await Promise.all(languages.map((name) => this.languageRepo.upsert({ name }, ['name'])));
  }

  private async seedEducations() {
    await Promise.all(educations.map((name) => this.educationepo.upsert({ name }, ['name'])));
  }

  private async seedSkills() {
    await Promise.all(skills.map((name) => this.skillRepo.upsert({ name }, ['name'])));
  }

  private async seedBlogCategories() {
    await Promise.all(
      blogCategories.map((item) =>
        this.blogCategoryRepo.upsert(
          {
            name: item.name,
            slug: item.slug,
          },
          ['name'],
        ),
      ),
    );
  }

  private async seedFeatures() {
    await Promise.all(
      features.map((item) =>
        this.featureRepo.upsert(
          {
            title: item.title,
            description: item.desciption,
          },
          ['title'],
        ),
      ),
    );
  }
}
