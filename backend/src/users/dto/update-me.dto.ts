import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  avatarEmoji?: string;
}
