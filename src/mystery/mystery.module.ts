import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MysteryService } from './mystery.service';
import { MysteryController } from './mystery.controller';
import { Mystery } from './entities/mystery.entity';
import { MysteryOption } from './entities/mystery-option.entity';
import { MysteryAttempt } from './entities/mystery-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mystery, MysteryOption, MysteryAttempt])],
  providers: [MysteryService],
  controllers: [MysteryController],
})
export class MysteryModule {}
