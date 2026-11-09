import { Module } from '@nestjs/common';
import { BibleController } from './bible.controller';

@Module({ controllers: [BibleController] })
export class BibleModule {}
