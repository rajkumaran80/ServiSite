import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  category: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  menuItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCategory = {
  id: 'cat-1',
  tenantId: 'tenant-1',
  name: 'Appetizers',
  description: 'Starters',
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMenuItem = {
  id: 'item-1',
  tenantId: 'tenant-1',
  categoryId: 'cat-1',
  name: 'Bruschetta',
  description: 'Toasted bread with tomatoes',
  price: 8.99,
  currency: 'USD',
  imageUrl: null,
  isAvailable: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: mockCategory,
};

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCategory', () => {
    it('should create a category', async () => {
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.createCategory('tenant-1', {
        name: 'Appetizers',
        description: 'Starters',
      });

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-1', name: 'Appetizers', description: 'Starters' },
      });
    });
  });

  describe('findAllCategories', () => {
    it('should return categories for tenant', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAllCategories('tenant-1');

      expect(result).toEqual([mockCategory]);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );
    });
  });

  describe('findCategoryById', () => {
    it('should return category by id for tenant', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);

      const result = await service.findCategoryById('tenant-1', 'cat-1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException for missing category', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.findCategoryById('tenant-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createMenuItem', () => {
    it('should create a menu item with category validation', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaService.menuItem.create.mockResolvedValue(mockMenuItem);

      const result = await service.createMenuItem('tenant-1', {
        name: 'Bruschetta',
        price: 8.99,
        categoryId: 'cat-1',
      });

      expect(result).toEqual(mockMenuItem);
    });

    it('should throw NotFoundException for invalid categoryId', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createMenuItem('tenant-1', {
          name: 'Item',
          price: 5.0,
          categoryId: 'invalid-cat',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllMenuItems', () => {
    it('should return items scoped to tenant', async () => {
      mockPrismaService.menuItem.findMany.mockResolvedValue([mockMenuItem]);

      const result = await service.findAllMenuItems('tenant-1');

      expect(result).toEqual([mockMenuItem]);
      expect(mockPrismaService.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        }),
      );
    });

    it('should filter by categoryId when provided', async () => {
      mockPrismaService.menuItem.findMany.mockResolvedValue([mockMenuItem]);

      await service.findAllMenuItems('tenant-1', { categoryId: 'cat-1' });

      expect(mockPrismaService.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', categoryId: 'cat-1' },
        }),
      );
    });
  });

  describe('updateMenuItem', () => {
    it('should update a menu item', async () => {
      const updatedItem = { ...mockMenuItem, name: 'Updated Bruschetta' };
      mockPrismaService.menuItem.findFirst.mockResolvedValue(mockMenuItem);
      mockPrismaService.menuItem.update.mockResolvedValue(updatedItem);

      const result = await service.updateMenuItem('tenant-1', 'item-1', {
        name: 'Updated Bruschetta',
      });

      expect(result.name).toBe('Updated Bruschetta');
    });

    it('should throw NotFoundException for non-existent item', async () => {
      mockPrismaService.menuItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMenuItem('tenant-1', 'non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMenuItem', () => {
    it('should delete a menu item', async () => {
      mockPrismaService.menuItem.findFirst.mockResolvedValue(mockMenuItem);
      mockPrismaService.menuItem.delete.mockResolvedValue(mockMenuItem);

      await service.deleteMenuItem('tenant-1', 'item-1');

      expect(mockPrismaService.menuItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });
});
