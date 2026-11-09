import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** A passage as picked in the admin dropdowns. Validated against the real book/chapter data by normalizePassage(). */
export class PassageDto {
  @IsString()
  @MaxLength(30)
  book: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  chapter?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(176)
  verseStart?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(176)
  verseEnd?: number | null;
}
