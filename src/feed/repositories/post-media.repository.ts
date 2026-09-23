import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PostMedia } from '../entities/post-media.entity';
@Injectable()
export class PostMediaRepository {
  constructor(
    @InjectRepository(PostMedia)
    private postMediaRepository: Repository<PostMedia>,
  ) {}
  async remove(postId: string) {
    return this.postMediaRepository.softDelete({ post: { id: postId } });
  }

  async saveMany(media: DeepPartial<PostMedia>[]) {
    return this.postMediaRepository.save(media);
  }
}
