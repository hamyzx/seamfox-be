import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrosswordController } from './cross-word.controller';
import { CrosswordService } from './cross-word.service';
import { Crossword } from './entities/crossword.entity';
import { CrossWordClue } from './entities/crossword-clue.entity';
import { CrosswordAttempt } from './entities/crossword-attempt.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Crossword, CrossWordClue, CrosswordAttempt])],
  controllers: [CrosswordController],
  providers: [CrosswordService],
})
export class CrossWordModule {}
