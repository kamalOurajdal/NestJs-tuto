import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

export type SafeAuthUser = {
  userId: string;
  email: string;
  name: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(dto: LoginDto): Promise<SafeAuthUser> {
    const record = await this.usersService.findByEmailWithPasswordHash(
      dto.email,
    );

    if (!record?.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      record.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      userId: String(record._id),
      email: record.email,
      name: record.name,
    };
  }

  async login(dto: LoginDto): Promise<{
    access_token: string;
    user: { id: string; email: string; name: string };
  }> {
    const user = await this.validateCredentials(dto);
    const payload = { sub: user.userId, email: user.email };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
      },
    };
  }
}
