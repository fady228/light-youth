import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.users.create({
      email: dto.email,
      displayName: dto.displayName.trim(),
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const ok =
      user?.passwordHash && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Wrong email or password');
    return this.issue(user);
  }

  /** Verifies a Google OAuth access token (from the frontend's implicit flow). */
  async google(accessToken: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new UnauthorizedException('Google sign-in is not configured');

    const tokenInfo = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!tokenInfo.ok) throw new UnauthorizedException('Invalid Google token');
    const info: any = await tokenInfo.json();
    if (info.aud !== clientId) throw new UnauthorizedException('Invalid Google token');

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new UnauthorizedException('Invalid Google token');
    const profile: any = await res.json();
    if (!profile.email || !profile.email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.users.findOrCreateGoogle({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
    });
    return this.issue(user);
  }

  private issue(user: User) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role }),
    };
  }
}
