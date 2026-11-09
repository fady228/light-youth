import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('users/me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('users/me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get('users/me/answers')
  answers(
    @CurrentUser() user: AuthUser,
    @Query('book') book?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.users.pastAnswers(user.id, { book, q, status, limit, offset });
  }

  @Get('leaderboard')
  leaderboard(@CurrentUser() user: AuthUser) {
    return this.users.leaderboard(user.id);
  }
}
