import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { BOOK_INFO } from './bible.util';

@UseGuards(JwtAuthGuard)
@Controller('bible')
export class BibleController {
  /** All 66 books with chapter counts, for the admin passage pickers. */
  @Get('books')
  books() {
    return BOOK_INFO;
  }
}
