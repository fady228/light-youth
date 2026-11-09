import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningItem } from './learning-item.entity';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { Passage } from './passage.entity';
import { SavedItem } from './saved-item.entity';
import { Tag } from './tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LearningItem, SavedItem, Tag, Passage])],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
