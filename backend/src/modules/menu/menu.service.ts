import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuGroupDto } from './dto/create-menu-group.dto';
import { Category, MenuItem, MenuGroup, HalfHalfPricingMode } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';
import { MENU_TEMPLATE_DATA } from './menu-templates';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
  ) {}

  /** Invalidate all menu-related cache keys and notify Next.js */
  private async invalidateMenu(slug: string): Promise<void> {
    await this.tenantCache.invalidate(slug, 'menu', 'menu-items');
    this.notify.revalidate(slug, ['menu']);
  }

  // ── Menu Groups ────────────────────────────────────────────────────────────

  async createMenuGroup(tenantId: string, dto: CreateMenuGroupDto, slug: string): Promise<MenuGroup> {
    const result = await this.prisma.menuGroup.create({ data: { ...dto, tenantId } });
    await this.invalidateMenu(slug);
    return result;
  }

  async findAllMenuGroups(tenantId: string): Promise<Array<MenuGroup & { _count: any }>> {
    return this.prisma.menuGroup.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { categories: true } } },
    });
  }

  async findMenuGroupById(tenantId: string, id: string): Promise<MenuGroup> {
    const group = await this.prisma.menuGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new NotFoundException(`Menu group '${id}' not found`);
    return group;
  }

  async updateMenuGroup(tenantId: string, id: string, dto: Partial<CreateMenuGroupDto>, slug: string): Promise<MenuGroup> {
    await this.findMenuGroupById(tenantId, id);
    const result = await this.prisma.menuGroup.update({ where: { id }, data: dto });
    await this.invalidateMenu(slug);
    return result;
  }

  async deleteMenuGroup(tenantId: string, id: string, slug: string): Promise<void> {
    await this.findMenuGroupById(tenantId, id);
    await this.prisma.category.updateMany({ where: { tenantId, menuGroupId: id }, data: { menuGroupId: null } });
    await this.prisma.menuGroup.delete({ where: { id } });
    await this.invalidateMenu(slug);
  }

  async reorderGroups(tenantId: string, groups: Array<{ id: string; sortOrder: number }>, slug: string): Promise<void> {
    await Promise.all(
      groups.map(({ id, sortOrder }) =>
        this.prisma.menuGroup.updateMany({ where: { id, tenantId }, data: { sortOrder } }),
      ),
    );
    await this.invalidateMenu(slug);
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async createCategory(tenantId: string, dto: CreateCategoryDto, slug: string): Promise<Category> {
    const result = await this.prisma.category.create({ data: { ...dto, tenantId } });
    await this.invalidateMenu(slug);
    return result;
  }

  async findAllCategories(tenantId: string): Promise<Array<Category & { _count: any }>> {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { menuItems: true } } },
    });
  }

  async findCategoryById(tenantId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundException(`Category '${id}' not found`);
    return category;
  }

  async updateCategory(tenantId: string, id: string, dto: Partial<CreateCategoryDto>, slug: string): Promise<Category> {
    await this.findCategoryById(tenantId, id);
    const result = await this.prisma.category.update({ where: { id }, data: dto });
    await this.invalidateMenu(slug);
    return result;
  }

  async deleteCategory(tenantId: string, id: string, slug: string): Promise<void> {
    await this.findCategoryById(tenantId, id);
    const itemsInCategory = await this.prisma.menuItem.findMany({
      where: { tenantId, categories: { some: { id } } },
      select: { id: true },
    });
    await Promise.all(
      itemsInCategory.map((item) =>
        this.prisma.menuItem.update({ where: { id: item.id }, data: { categories: { disconnect: { id } } } }),
      ),
    );
    await this.prisma.category.delete({ where: { id } });
    await this.invalidateMenu(slug);
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────

  async createMenuItem(tenantId: string, dto: CreateMenuItemDto, slug: string): Promise<MenuItem> {
    const { categoryIds, ...rest } = dto;
    if (categoryIds?.length) {
      await Promise.all(categoryIds.map((id) => this.findCategoryById(tenantId, id)));
    }
    const item = await this.prisma.menuItem.create({
      data: {
        ...rest,
        tenantId,
        allergens: rest.allergens ?? [],
        categories: categoryIds?.length ? { connect: categoryIds.map((id) => ({ id })) } : undefined,
      },
      include: { categories: { select: { id: true, name: true } } },
    });
    await this.invalidateMenu(slug);
    return { ...item, price: parseFloat(item.price.toString()), categoryIds: item.categories.map((c) => c.id) } as any;
  }

  async findAllMenuItems(tenantId: string, options?: { categoryId?: string; isAvailable?: boolean }): Promise<MenuItem[]> {
    const where: any = { tenantId };
    if (options?.categoryId) where.categories = { some: { id: options.categoryId } };
    if (options?.isAvailable !== undefined) where.isAvailable = options.isAvailable;

    const items = await this.prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { categories: { select: { id: true, name: true } } },
    });
    return items.map((item) => ({
      ...item,
      price: parseFloat(item.price.toString()),
      categoryIds: (item.categories ?? []).map((c) => c.id),
    })) as any;
  }

  async findMenuByGroups(tenantId: string, slug: string) {
    const cached = await this.tenantCache.get<any>(slug, 'menu');
    if (cached) return cached;

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
      categoryIds: (item.categories ?? []).map((c: any) => c.id),
      // Size variants (replaces base price when selected)
      variants: (item.variants ?? []).map((v: any) => ({
        id: v.id,
        name: v.name,
        price: parseFloat(v.price.toString()),
        isDefault: v.isDefault,
        sortOrder: v.sortOrder,
      })),
      // Modifier groups for customisation (size, extras, etc.)
      modifierGroups: (item.modifierGroups ?? []).map((mg: any) => ({
        id: mg.modifierGroup.id,
        name: mg.modifierGroup.name,
        type: mg.modifierGroup.type,
        required: mg.modifierGroup.required,
        minSelect: mg.modifierGroup.minSelect,
        maxSelect: mg.modifierGroup.maxSelect,
        freeLimit: mg.modifierGroup.freeLimit,
        sortOrder: mg.sortOrder,
        options: (mg.modifierGroup.options ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          priceAdjustment: parseFloat(o.priceAdjustment.toString()),
          isDefault: o.isDefault,
          sortOrder: o.sortOrder,
        })),
      })),
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
              include: {
                categories: { select: { id: true } },
                variants: { orderBy: { sortOrder: 'asc' } },
                modifierGroups: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    modifierGroup: {
                      include: {
                        options: {
                          where: { isAvailable: true },
                          orderBy: { sortOrder: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const uncategorized = await this.prisma.menuItem.findMany({
      where: { tenantId, categories: { none: {} }, isAvailable: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const result = {
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

    await this.tenantCache.set(slug, 'menu', result, TTL.MENU_FULL);
    return result;
  }

  async findMenuItemById(tenantId: string, id: string): Promise<MenuItem> {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, tenantId },
      include: { categories: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundException(`Menu item '${id}' not found`);
    return { ...item, price: parseFloat(item.price.toString()), categoryIds: item.categories.map((c) => c.id) } as any;
  }

  async updateMenuItem(tenantId: string, id: string, dto: UpdateMenuItemDto, slug: string): Promise<MenuItem> {
    await this.findMenuItemById(tenantId, id);
    const { categoryIds, ...rest } = dto;
    if (categoryIds?.length) {
      await Promise.all(categoryIds.map((cid) => this.findCategoryById(tenantId, cid)));
    }
    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: { ...rest, ...(categoryIds !== undefined && { categories: { set: categoryIds.map((cid) => ({ id: cid })) } }) },
      include: { categories: { select: { id: true, name: true } } },
    });
    await this.invalidateMenu(slug);
    return { ...updated, price: parseFloat(updated.price.toString()), categoryIds: updated.categories.map((c) => c.id) } as any;
  }

  async deleteMenuItem(tenantId: string, id: string, slug: string): Promise<void> {
    await this.findMenuItemById(tenantId, id);
    await this.prisma.menuItem.delete({ where: { id } });
    await this.invalidateMenu(slug);
  }

  async reorderItems(tenantId: string, items: Array<{ id: string; sortOrder: number }>, slug: string): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.menuItem.updateMany({ where: { id, tenantId }, data: { sortOrder } }),
      ),
    );
    await this.invalidateMenu(slug);
  }

  // ── Item Variants ──────────────────────────────────────────────────────────

  async getVariants(tenantId: string, menuItemId: string) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');
    const variants = await this.prisma.itemVariant.findMany({
      where: { menuItemId },
      orderBy: { sortOrder: 'asc' },
    });
    return variants.map((v) => ({ ...v, price: parseFloat(v.price.toString()) }));
  }

  async upsertVariants(tenantId: string, menuItemId: string, slug: string, variants: Array<{ id?: string; name: string; price: number; isDefault?: boolean; sortOrder?: number }>) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');

    // Replace all variants atomically
    await this.prisma.$transaction(async (tx) => {
      await tx.itemVariant.deleteMany({ where: { menuItemId } });
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        await tx.itemVariant.create({
          data: {
            tenantId,
            menuItemId,
            name: v.name,
            price: v.price,
            isDefault: v.isDefault ?? i === 0,
            sortOrder: v.sortOrder ?? i,
          },
        });
      }
    });

    await this.invalidateMenu(slug);
    return this.getVariants(tenantId, menuItemId);
  }

  // ── Half & Half Configs ───────────────────────────────────────────────────

  async listHalfHalf(tenantId: string) {
    const configs = await this.prisma.halfHalfConfig.findMany({
      where: { tenantId },
      include: {
        leftItem: { select: { id: true, name: true, price: true } },
        rightItem: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return configs;
  }

  async createHalfHalf(tenantId: string, dto: { name: string; leftItemId: string; rightItemId: string; pricingMode?: HalfHalfPricingMode }) {
    const [left, right] = await Promise.all([
      this.prisma.menuItem.findFirst({ where: { id: dto.leftItemId, tenantId } }),
      this.prisma.menuItem.findFirst({ where: { id: dto.rightItemId, tenantId } }),
    ]);
    if (!left) throw new NotFoundException(`Left item ${dto.leftItemId} not found`);
    if (!right) throw new NotFoundException(`Right item ${dto.rightItemId} not found`);

    return this.prisma.halfHalfConfig.create({
      data: {
        tenantId,
        name: dto.name,
        leftItemId: dto.leftItemId,
        rightItemId: dto.rightItemId,
        pricingMode: dto.pricingMode ?? 'MAX',
      },
      include: {
        leftItem: { select: { id: true, name: true, price: true } },
        rightItem: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async updateHalfHalf(tenantId: string, id: string, dto: Partial<{ name: string; leftItemId: string; rightItemId: string; pricingMode: HalfHalfPricingMode; isActive: boolean }>) {
    const existing = await this.prisma.halfHalfConfig.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Half & Half config not found');

    return this.prisma.halfHalfConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.leftItemId !== undefined && { leftItemId: dto.leftItemId }),
        ...(dto.rightItemId !== undefined && { rightItemId: dto.rightItemId }),
        ...(dto.pricingMode !== undefined && { pricingMode: dto.pricingMode }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        leftItem: { select: { id: true, name: true, price: true } },
        rightItem: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async deleteHalfHalf(tenantId: string, id: string) {
    const existing = await this.prisma.halfHalfConfig.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Half & Half config not found');
    await this.prisma.halfHalfConfig.delete({ where: { id } });
  }

  async seedTemplate(tenantId: string, slug: string, clearExisting = false): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const groups = MENU_TEMPLATE_DATA[tenant.type];
    if (!groups || groups.length === 0) throw new ConflictException('No template available for this business type');

    if (clearExisting) {
      await this.prisma.menuItem.deleteMany({ where: { tenantId } });
      await this.prisma.category.deleteMany({ where: { tenantId } });
      await this.prisma.menuGroup.deleteMany({ where: { tenantId } });
    } else {
      const existing = await this.prisma.menuGroup.count({ where: { tenantId } });
      if (existing > 0) throw new ConflictException('Menu already has groups. Pass clearExisting=true to overwrite.');
    }

    for (let gi = 0; gi < groups.length; gi++) {
      const groupDef = groups[gi];
      const group = await this.prisma.menuGroup.create({
        data: {
          tenantId,
          name: groupDef.name,
          icon: groupDef.icon,
          sortOrder: gi,
          isActive: true,
          ...(groupDef.servedFrom && { servedFrom: groupDef.servedFrom }),
          ...(groupDef.servedUntil && { servedUntil: groupDef.servedUntil }),
        },
      });

      for (let ci = 0; ci < groupDef.categories.length; ci++) {
        const catDef = groupDef.categories[ci];
        const category = await this.prisma.category.create({
          data: { tenantId, menuGroupId: group.id, name: catDef.name, sortOrder: ci },
        });

        for (let ii = 0; ii < catDef.items.length; ii++) {
          const itemDef = catDef.items[ii];
          await this.prisma.menuItem.create({
            data: {
              tenantId,
              name: itemDef.name,
              price: itemDef.price,
              description: itemDef.description || null,
              isPopular: itemDef.isPopular || false,
              isAvailable: true,
              sortOrder: ii,
              categories: { connect: { id: category.id } },
            },
          });
        }
      }
    }

    await this.invalidateMenu(slug);
  }
}
