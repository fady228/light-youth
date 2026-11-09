import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { PassageDto } from '../../bible/passage.dto';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  @MaxLength(2000)
  answer: string;
}

export class SubmitDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class CreateQuestionDto {
  @IsIn(['multiple_choice', 'true_false', 'open'])
  type: 'multiple_choice' | 'true_false' | 'open';

  @IsString()
  @MaxLength(500)
  prompt: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  correctAnswer?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  points: number;
}

export class CreateDevotionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'publishDate must be YYYY-MM-DD' })
  @IsDateString({ strict: true })
  publishDate: string;

  /** The reading, picked from the dropdowns (book + chapter required, verses optional). */
  @IsDefined({ message: 'Choose the Bible passage for the reading' })
  @ValidateNested()
  @Type(() => PassageDto)
  passage: PassageDto;

  /** Optional highlighted verse (book, chapter and verse required). */
  @IsOptional()
  @ValidateNested()
  @Type(() => PassageDto)
  keyVerse?: PassageDto | null;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reflectionQuote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reflectionAuthor?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

/** Questions are intentionally not editable after creation (existing answers reference them). */
export class UpdateDevotionDto extends PartialType(OmitType(CreateDevotionDto, ['questions'] as const)) {}
