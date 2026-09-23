import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PostSave } from '../entities/post-save.entity';

@Injectable()
export class PostSaveRepository extends Repository<PostSave> {
  constructor(private dataSource: DataSource) {
    super(PostSave, dataSource.createEntityManager());
  }

  async findOneSave(userId: string, postId: string): Promise<PostSave | null> {
    return this.findOne({ where: { userId, postId } });
  }

  async createSave(userId: string, postId: string): Promise<PostSave> {
    const save = this.create({ userId, postId });
    return this.save(save);
  }

  async removeSave(userId: string, postId: string): Promise<void> {
    await this.delete({ userId, postId });
  }

  async isSaved(userId: string, postId: string): Promise<boolean> {
    const count = await this.count({ where: { userId, postId } });
    return count > 0;
  }
}
