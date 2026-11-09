import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleDto, LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('google')
  google(@Body() dto: GoogleDto) {
    return this.auth.google(dto.accessToken);
  }
}
