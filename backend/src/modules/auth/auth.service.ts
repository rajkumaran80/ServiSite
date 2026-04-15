import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/notifications/email.service';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      configService.get<string>('GOOGLE_CLIENT_ID', ''),
    );
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { tenant: { select: { id: true, slug: true, name: true } } },
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<TokenPair & { user: any }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified && user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant,
      },
    };
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  async googleLogin(idToken: string): Promise<TokenPair & { user: any }> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    if (!clientId) {
      throw new BadRequestException('Google login is not configured');
    }

    let payload: any;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleId, email, name } = payload;
    if (!email) throw new UnauthorizedException('Google account has no email');

    // Find user by googleId or email
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
      include: { tenant: { select: { id: true, slug: true, name: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('No account found for this Google account. Please sign up first.');
    }

    // Link googleId if not already linked
    if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId, emailVerified: true },
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      });
    }

    // Google-verified users are always considered email-verified
    if (!user.emailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { emailVerified: true },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant,
      },
    };
  }

  // ── Email verification ─────────────────────────────────────────────────────

  async sendVerificationEmail(userId: string): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token, emailVerificationExpiry: expiry },
      include: { tenant: { select: { name: true } } },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    await this.emailService.emailVerification(
      user.email,
      user.tenant.name,
      verificationUrl,
    );
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    // Mark user and tenant as verified
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      }),
      this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { emailVerified: true },
      }),
    ]);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async impersonateTenant(
    tenantId: string,
    superAdmin: { id: string; email: string },
  ): Promise<TokenPair & { user: any; tenantSlug: string }> {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' },
      include: { tenant: { select: { id: true, slug: true, name: true } } },
    });
    if (!user) throw new BadRequestException('No admin user found for this tenant');

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId, superAdmin);
    return {
      ...tokens,
      tenantSlug: user.tenant.slug,
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, tenant: user.tenant },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });
    if (!user) return; // Silently succeed — don't leak whether email exists

    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.emailService.send(
      user.email,
      'Reset your ServiSite password',
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">Reset your password</h2>
        <p>We received a request to reset the password for your ServiSite account.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${resetUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Reset Password
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">ServiSite · support@servisite.com</p>
      </div>`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) return; // Silently succeed — don't leak whether email exists

    if (user.emailVerified) return; // Already verified, nothing to do

    await this.sendVerificationEmail(user.id);
  }

  // ── Token management ───────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token expired, please login again');
    }

    // Rotate refresh token (delete old, generate new)
    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    const { user } = tokenRecord;
    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    tenantId: string,
    impersonatedBy?: { id: string; email: string },
  ): Promise<TokenPair> {
    const payload: Record<string, any> = { sub: userId, email, role, tenantId };
    if (impersonatedBy) {
      payload.impersonatedById = impersonatedBy.id;
      payload.impersonatedByEmail = impersonatedBy.email;
    }

    const accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m');
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry,
    });

    const refreshToken = uuidv4();
    const expiresAt = this.calculateExpiry(refreshTokenExpiry);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    const expiresIn = this.parseExpiryToSeconds(accessTokenExpiry);

    return { accessToken, refreshToken, expiresIn };
  }

  private calculateExpiry(expiry: string): Date {
    const now = new Date();
    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's': return new Date(now.getTime() + num * 1000);
      case 'm': return new Date(now.getTime() + num * 60 * 1000);
      case 'h': return new Date(now.getTime() + num * 60 * 60 * 1000);
      case 'd': return new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900;

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd': return num * 86400;
      default: return 900;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
}
