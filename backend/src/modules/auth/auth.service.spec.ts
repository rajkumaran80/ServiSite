import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, fallback: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    };
    return config[key] ?? fallback;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without passwordHash on valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@test.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'ADMIN',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', slug: 'test', name: 'Test' },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin@test.com', 'password123');

      expect(result).toBeDefined();
      expect(result?.email).toBe('admin@test.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@test.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for wrong password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@test.com',
        passwordHash: await bcrypt.hash('correctpassword', 12),
        role: 'ADMIN',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', slug: 'test', name: 'Test' },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin@test.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens and user on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@test.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'ADMIN',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', slug: 'test', name: 'Test Tenant' },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'mock-refresh-token',
        userId: 'user-1',
        expiresAt: new Date(),
      });

      const result = await service.login({ email: 'admin@test.com', password: 'password123' });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@test.com');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'bad@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should rotate refresh tokens successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockTokenRecord = {
        id: 'token-1',
        token: 'old-refresh-token',
        expiresAt: futureDate,
        user: {
          id: 'user-1',
          email: 'admin@test.com',
          role: 'ADMIN',
          tenantId: 'tenant-1',
        },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockPrismaService.refreshToken.delete.mockResolvedValue(mockTokenRecord);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-2',
        token: 'new-refresh-token',
      });

      const result = await service.refreshTokens('old-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'expired-token',
        expiresAt: pastDate,
        user: { id: 'user-1' },
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete refresh token on logout', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
      });
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testpassword123';
      const hashed = await service.hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(await bcrypt.compare(password, hashed)).toBe(true);
    });
  });
});
