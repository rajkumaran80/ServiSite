import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

class ResendVerificationDto {
  @IsEmail()
  email: string;
}

// Strict rate limit on all auth endpoints: 5 attempts per minute per IP
@Throttle({ api: { limit: 5, ttl: 60_000 } })
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns token pair' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or email not verified' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      data: result,
      success: true,
      message: 'Login successful',
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or link account with Google ID token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid Google token or no matching account' })
  async googleLogin(@Body() body: GoogleLoginDto) {
    const result = await this.authService.googleLogin(body.idToken);
    return {
      data: result,
      success: true,
      message: 'Login successful',
    };
  }

  @Public()
  @SkipThrottle()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address via token' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return { data: result, success: true, message: result.message };
  }

  @Public()
  @SkipThrottle()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() body: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(body.email);
    return {
      data: null,
      success: true,
      message: 'If that email exists and is unverified, a new link has been sent.',
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    return {
      data: tokens,
      success: true,
      message: 'Tokens refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return {
      data: null,
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser('sub') userId: string) {
    await this.authService.logoutAll(userId);
    return {
      data: null,
      success: true,
      message: 'Logged out from all devices',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: any) {
    return {
      data: user,
      success: true,
    };
  }
}
