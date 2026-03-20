import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TenantType } from '@prisma/client';

const mockPrismaService = {
  tenant: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  menuItem: {
    count: jest.fn(),
  },
  category: {
    count: jest.fn(),
  },
  galleryImage: {
    count: jest.fn(),
  },
};

const mockAuthService = {
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
};

const mockTenant = {
  id: 'tenant-1',
  name: 'Pizza Palace',
  slug: 'pizza-palace',
  type: TenantType.RESTAURANT,
  logo: null,
  banner: null,
  themeSettings: {},
  currency: 'USD',
  timezone: 'UTC',
  locale: 'en',
  whatsappNumber: null,
  qrCodeUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Pizza Palace',
      slug: 'pizza-palace',
      type: TenantType.RESTAURANT,
      adminEmail: 'admin@pizzapalace.com',
      adminPassword: 'password123',
    };

    it('should create a new tenant with admin user', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTenant);
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Pizza Palace',
            slug: 'pizza-palace',
          }),
        }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return array of tenants', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([mockTenant]);

      const result = await service.findAll();

      expect(result).toEqual([mockTenant]);
      expect(mockPrismaService.tenant.findMany).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('should return tenant by slug', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findBySlug('pizza-palace');

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'pizza-palace' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update tenant', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated Pizza Palace' };
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.update('tenant-1', { name: 'Updated Pizza Palace' });

      expect(result.name).toBe('Updated Pizza Palace');
    });

    it('should throw NotFoundException for non-existent tenant', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTenantStats', () => {
    it('should return tenant statistics', async () => {
      mockPrismaService.menuItem.count.mockResolvedValue(15);
      mockPrismaService.category.count.mockResolvedValue(4);
      mockPrismaService.galleryImage.count.mockResolvedValue(8);

      const result = await service.getTenantStats('tenant-1');

      expect(result).toEqual({
        menuItems: 15,
        categories: 4,
        galleryImages: 8,
      });
    });
  });
});
