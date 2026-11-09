import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevotionsController } from './devotions.controller';
import { DevotionsService } from './devotions.service';
import { User } from '../users/user.entity';
import { Devotion } from './devotion.entity';
import { Question } from './question.entity';
import { Submission } from './submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Devotion, Question, Submission, User])],
  controllers: [DevotionsController],
  providers: [DevotionsService],
})
export class DevotionsModule {}
