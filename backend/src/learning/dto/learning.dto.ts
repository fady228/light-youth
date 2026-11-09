import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { PassageDto } from '../../bible/passage.dto';
import { ITEM_TYPES, ItemType } from '../learning-item.entity';
import { PDF_NAME } from '../uploads';

export class CreateLearningDto {
  @IsIn(ITEM_TYPES)
  type: ItemType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** Required for videos and sermons. Articles don't need one: it's generated from the text. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string | null;

  /** Article body (required for articles); optional notes/transcript for videos and sermons. */
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  content?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  videoUrl?: string | null;

  @IsOptional()
  @Matches(PDF_NAME, { message: 'fileName must be a name returned by the upload endpoint' })
  fileName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileOriginal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  /** Picked from the Bible dropdowns (book / chapter / verses); validated against real chapter counts. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PassageDto)
  passages?: PassageDto[];
}

export class UpdateLearningDto extends PartialType(CreateLearningDto) {}
