import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuGroupDto } from './dto/create-menu-group.dto';
import { Category, MenuItem, MenuGroup } from '@prisma/client';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- Menu Groups ----

  async createMenuGroup(tenantId: string, dto: CreateMenuGroupDto): Promise<MenuGroup> {
    return this.prisma.menuGroup.create({
      data: { ...dto, tenantId },
    });
  }

  async findAllMenuGroups(tenantId: string): Promise<Array<MenuGroup & { _count: any }>> {
    return this.prisma.menuGroup.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { categories: true } },
      },
    });
  }

  async findMenuGroupById(tenantId: string, id: string): Promise<MenuGroup> {
    const group = await this.prisma.menuGroup.findFirst({
      where: { id, tenantId },
    });

    if (!group) {
      throw new NotFoundException(`Menu group '${id}' not found`);
    }

    return group;
  }

  async updateMenuGroup(
    tenantId: string,
    id: string,
    dto: Partial<CreateMenuGroupDto>,
  ): Promise<MenuGroup> {
    await this.findMenuGroupById(tenantId, id);
    return this.prisma.menuGroup.update({ where: { id }, data: dto });
  }

  async deleteMenuGroup(tenantId: string, id: string): Promise<void> {
    await this.findMenuGroupById(tenantId, id);

    await this.prisma.category.updateMany({
      where: { tenantId, menuGroupId: id },
      data: { menuGroupId: null },
    });

    await this.prisma.menuGroup.delete({ where: { id } });
  }

  async reorderGroups(
    tenantId: string,
    groups: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    await Promise.all(
      groups.map(({ id, sortOrder }) =>
        this.prisma.menuGroup.updateMany({
          where: { id, tenantId },
          data: { sortOrder },
        }),
      ),
    );
  }

  // ---- Categories ----

  async createCategory(tenantId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: { ...dto, tenantId },
    });
  }

  async findAllCategories(tenantId: string): Promise<Array<Category & { _count: any }>> {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { menuItems: true } },
      },
    });
  }

  async findCategoryById(tenantId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException(`Category '${id}' not found`);
    }

    return category;
  }

  async updateCategory(
    tenantId: string,
    id: string,
    dto: Partial<CreateCategoryDto>,
  ): Promise<Category> {
    await this.findCategoryById(tenantId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(tenantId: string, id: string): Promise<void> {
    await this.findCategoryById(tenantId, id);

    await this.prisma.menuItem.updateMany({
      where: { tenantId, categoryId: id },
      data: { categoryId: null },
    });

    await this.prisma.category.delete({ where: { id } });
  }

  // ---- Menu Items ----

  async createMenuItem(tenantId: string, dto: CreateMenuItemDto): Promise<MenuItem> {
    if (dto.categoryId) {
      await this.findCategoryById(tenantId, dto.categoryId);
    }

    return this.prisma.menuItem.create({
      data: {
        ...dto,
        tenantId,
        price: dto.price,
        allergens: dto.allergens ?? [],
      },
      include: { category: true },
    });
  }

  async findAllMenuItems(
    tenantId: string,
    options?: { categoryId?: string; isAvailable?: boolean },
  ): Promise<MenuItem[]> {
    const where: any = { tenantId };

    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.isAvailable !== undefined) where.isAvailable = options.isAvailable;

    return this.prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async findMenuByGroups(tenantId: string) {
    const serializeItem = (item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price.toString()),
      currency: item.currency,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isPopular: item.isPopular,
      allergens: item.allergens,
      sortOrder: item.sortOrder,
      categoryId: item.categoryId,
    });

    const groups = await this.prisma.menuGroup.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        categories: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    const uncategorized = await this.prisma.menuItem.findMany({
      where: { tenantId, categoryId: null, isAvailable: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        icon: group.icon,
        description: group.description,
        servedFrom: group.servedFrom,
        servedUntil: group.servedUntil,
        isActive: group.isActive,
        sortOrder: group.sortOrder,
        categories: group.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          menuItems: cat.menuItems.map(serializeItem),
        })),
      })),
      uncategorized: uncategorized.map(serializeItem),
    };
  }

  async findMenuItemById(tenantId: string, id: string): Promise<MenuItem> {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, tenantId },
      include: { category: true },
    });

    if (!item) throw new NotFoundException(`Menu item '${id}' not found`);

    return item;
  }

  async updateMenuItem(
    tenantId: string,
    id: string,
    dto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    await this.findMenuItemById(tenantId, id);

    if (dto.categoryId) {
      await this.findCategoryById(tenantId, dto.categoryId);
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async deleteMenuItem(tenantId: string, id: string): Promise<void> {
    await this.findMenuItemById(tenantId, id);
    await this.prisma.menuItem.delete({ where: { id } });
  }

  async reorderItems(
    tenantId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.menuItem.updateMany({
          where: { id, tenantId },
          data: { sortOrder },
        }),
      ),
    );
  }
}
