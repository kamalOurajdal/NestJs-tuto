import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from './decorators';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AllowedAccessTokenTypes } from './decorators/allowed-access-token-types.decorator';
import { TokenType } from './models/token-type.enum';
import { UsersService } from '../users/users.service';
import { CookiesService } from '../../common/security/cookies.service';
import type { Response } from 'express';
import AUTH_COOKIE_NAMES from './constants/auth.constant';
import { RequireRefreshToken } from './guards/require-refresh-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  private readonly REFRESH_COOKIE_OPTIONS = { path: '/auth/session' };

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login and receive authentication cookies.' })
  @ApiResponse({
    status: 201,
    schema: {
      example: { message: 'Login successful' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenPair = await this.authService.login(loginDto);

    this.cookiesService.set(
      res,
      AUTH_COOKIE_NAMES.ACCESS,
      tokenPair.access_token,
    );

    if (tokenPair.refresh_token) {
      this.cookiesService.set(
        res,
        AUTH_COOKIE_NAMES.REFRESH,
        tokenPair.refresh_token,
        this.REFRESH_COOKIE_OPTIONS,
      );
    }

    return { message: 'Login successful' };
  }

  @Post('session/refresh')
  @RequireRefreshToken()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh cookies.' })
  @ApiResponse({
    status: 200,
    schema: {
      example: { message: 'Tokens refreshed successfully' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid.' })
  refresh(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ) {
    const tokenPair = this.authService.refresh(user);

    this.cookiesService.set(
      res,
      AUTH_COOKIE_NAMES.ACCESS,
      tokenPair.access_token,
    );

    this.cookiesService.set(
      res,
      AUTH_COOKIE_NAMES.REFRESH,
      tokenPair.refresh_token,
      this.REFRESH_COOKIE_OPTIONS,
    );

    return { message: 'Tokens refreshed successfully' };
  }

  @Post('session/logout')
  @Public()
  @ApiOperation({ summary: 'Logout and clear authentication cookies.' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.cookiesService.clear(res, AUTH_COOKIE_NAMES.ACCESS);
    this.cookiesService.clear(
      res,
      AUTH_COOKIE_NAMES.REFRESH,
      this.REFRESH_COOKIE_OPTIONS,
    );
    return { message: 'Logout successful' };
  }

  @Get('me')
  @AllowedAccessTokenTypes(TokenType.ACCESS, TokenType.CHANGE_PASSWORD)
  @ApiOperation({ summary: 'Get the authenticated user profile.' })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid.' })
  me(@CurrentUser() user: User) {
    return this.usersService.toUserDto(user);
  }

  @Post('change-password')
  @AllowedAccessTokenTypes(TokenType.ACCESS, TokenType.CHANGE_PASSWORD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the authenticated user password.' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid.' })
  @ApiForbiddenResponse({ description: 'Current password is invalid.' })
  changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordData: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, changePasswordData);
  }
}
