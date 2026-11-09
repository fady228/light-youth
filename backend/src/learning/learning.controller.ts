import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { closeSync, openSync, readSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles';
import { CreateLearningDto, UpdateLearningDto } from './dto/learning.dto';
import { LearningService } from './learning.service';
import { MAX_PDF_BYTES, uploadDir } from './uploads';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('learning')
export class LearningController {
  constructor(private learning: LearningService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('passage') passage?: string,
    @Query('tag') tag?: string,
    @Query('featured') featured?: string,
  ) {
    return this.learning.list(user.id, { q, type, passage, tag, featured: featured === 'true' });
  }

  // ---- static routes must come before ":id" ----

  @Get('facets')
  facets() {
    return this.learning.facets(false);
  }

  @Get('saved')
  saved(@CurrentUser() user: AuthUser) {
    return this.learning.savedList(user.id);
  }

  @Roles('admin')
  @Get('admin/all')
  adminList(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('passage') passage?: string,
    @Query('tag') tag?: string,
  ) {
    return this.learning.adminList({ q, type, passage, tag });
  }

  @Roles('admin')
  @Get('admin/facets')
  adminFacets() {
    return this.learning.facets(true);
  }

  /** Reading view for admins: works for drafts too. Declared after the other "admin/*" routes. */
  @Roles('admin')
  @Get('admin/:id')
  adminGet(@Param('id', ParseUUIDPipe) id: string) {
    return this.learning.adminGet(id);
  }

  /** Step 1 of adding a sermon: upload the PDF, then send the returned fileName when saving the item. */
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir()),
        filename: (_req, _file, cb) => cb(null, `${randomUUID()}.pdf`),
      }),
      limits: { fileSize: MAX_PDF_BYTES },
      fileFilter: (_req, file, cb) =>
        file.mimetype === 'application/pdf' ? cb(null, true) : cb(new BadRequestException('Only PDF files are allowed'), false),
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Attach a PDF in the "file" field');
    // The mimetype is client-supplied, so also check the file really starts with "%PDF-".
    const fd = openSync(file.path, 'r');
    const head = Buffer.alloc(5);
    readSync(fd, head, 0, 5, 0);
    closeSync(fd);
    if (head.toString('latin1') !== '%PDF-') {
      unlinkSync(file.path);
      throw new BadRequestException('That file is not a valid PDF');
    }
    // multer decodes names as latin1; restore UTF-8 (e.g. Arabic file names)
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 200);
    return { fileName: file.filename, fileOriginal: original, size: file.size };
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.learning.get(id, user.id);
  }

  @Post(':id/save')
  save(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.learning.save(user.id, id);
  }

  @Delete(':id/save')
  unsave(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.learning.unsave(user.id, id);
  }

  // ----- admin -----
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateLearningDto) {
    return this.learning.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLearningDto) {
    return this.learning.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.learning.remove(id);
  }
}
