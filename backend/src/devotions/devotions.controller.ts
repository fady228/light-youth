import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles';
import { DevotionsService } from './devotions.service';
import { CreateDevotionDto, SubmitDto, UpdateDevotionDto } from './dto/devotion.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devotions')
export class DevotionsController {
  constructor(private devotions: DevotionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('book') book?: string,
    @Query('q') q?: string,
  ) {
    return this.devotions.list(user.id, { status, book, q });
  }

  @Roles('admin')
  @Get('admin/all')
  adminList() {
    return this.devotions.adminList();
  }

  @Roles('admin')
  @Get('admin/:id')
  adminGet(@Param('id', ParseUUIDPipe) id: string) {
    return this.devotions.adminGet(id);
  }

  @Get('today')
  today(@CurrentUser() user: AuthUser) {
    return this.devotions.today(user.id);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.devotions.get(id, user.id);
  }

  @Post(':id/submit')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitDto,
  ) {
    return this.devotions.submit(id, user.id, dto);
  }

  // ----- admin -----
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateDevotionDto) {
    return this.devotions.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDevotionDto) {
    return this.devotions.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.devotions.remove(id);
  }
}
