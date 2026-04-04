import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { CreateModifierOptionDto } from './dto/create-modifier-option.dto';
import { AssignModifiersDto } from './dto/assign-modifiers.dto';
import { Decimal } from '@prisma/client/runtime/library';

const groupWithOptions = {
  options: { orderBy: { sortOrder: 'asc' as const } },
  menuItems: {
    include: { menuItem: { select: { id: true, name: true } } },
  },
};

@Injectable()
export class ModifiersService {
  constructor(private prisma: PrismaService) {}

  private assertOwns(tenantId: string, groupTenantId: string) {
    if (groupTenantId !== tenantId) throw new ForbiddenException();
  }

  // ── Modifier Groups ──────────────────────────────────────────────────────

  async getGroups(tenantId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { tenantId },
      include: groupWithOptions,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createGroup(tenantId: string, dto: CreateModifierGroupDto) {
    return this.prisma.modifierGroup.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type ?? 'SINGLE_SELECT',
        required: dto.required ?? false,
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? null,
        freeLimit: dto.freeLimit ?? 0,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: groupWithOptions,
    });
  }

  async updateGroup(tenantId: string, id: string, dto: Partial<CreateModifierGroupDto>) {
    const group = await this.prisma.modifierGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Modifier group not found');
    this.assertOwns(tenantId, group.tenantId);

    return this.prisma.modifierGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.required !== undefined && { required: dto.required }),
        ...(dto.minSelect !== undefined && { minSelect: dto.minSelect }),
        ...(dto.maxSelect !== undefined && { maxSelect: dto.maxSelect }),
        ...(dto.freeLimit !== undefined && { freeLimit: dto.freeLimit }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: groupWithOptions,
    });
  }

  async deleteGroup(tenantId: string, id: string) {
    const group = await this.prisma.modifierGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Modifier group not found');
    this.assertOwns(tenantId, group.tenantId);
    await this.prisma.modifierGroup.delete({ where: { id } });
  }

  // ── Modifier Options ─────────────────────────────────────────────────────

  async addOption(tenantId: string, groupId: string, dto: CreateModifierOptionDto) {
    const group = await this.prisma.modifierGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Modifier group not found');
    this.assertOwns(tenantId, group.tenantId);

    return this.prisma.modifierOption.create({
      data: {
        modifierGroupId: groupId,
        name: dto.name,
        priceAdjustment: new Decimal(dto.priceAdjustment ?? 0),
        isDefault: dto.isDefault ?? false,
        isAvailable: dto.isAvailable ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateOption(tenantId: string, optionId: string, dto: Partial<CreateModifierOptionDto>) {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id: optionId },
      include: { modifierGroup: true },
    });
    if (!option) throw new NotFoundException('Option not found');
    this.assertOwns(tenantId, option.modifierGroup.tenantId);

    return this.prisma.modifierOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.priceAdjustment !== undefined && { priceAdjustment: new Decimal(dto.priceAdjustment) }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteOption(tenantId: string, optionId: string) {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id: optionId },
      include: { modifierGroup: true },
    });
    if (!option) throw new NotFoundException('Option not found');
    this.assertOwns(tenantId, option.modifierGroup.tenantId);
    await this.prisma.modifierOption.delete({ where: { id: optionId } });
  }

  // ── Assign modifier groups to a menu item ────────────────────────────────

  async assignToMenuItem(tenantId: string, menuItemId: string, dto: AssignModifiersDto) {
    // Verify item belongs to tenant
    const item = await this.prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');

    // Verify all groups belong to tenant
    for (const g of dto.groups) {
      const group = await this.prisma.modifierGroup.findFirst({
        where: { id: g.modifierGroupId, tenantId },
      });
      if (!group) throw new NotFoundException(`Modifier group ${g.modifierGroupId} not found`);
    }

    // Replace all assignments atomically
    await this.prisma.$transaction([
      this.prisma.menuItemModifierGroup.deleteMany({ where: { menuItemId } }),
      ...dto.groups.map((g) =>
        this.prisma.menuItemModifierGroup.create({
          data: {
            menuItemId,
            modifierGroupId: g.modifierGroupId,
            sortOrder: g.sortOrder ?? 0,
          },
        }),
      ),
    ]);

    return this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /** Get modifier groups attached to a specific menu item (public-safe). */
  async getItemModifiers(menuItemId: string) {
    return this.prisma.menuItemModifierGroup.findMany({
      where: { menuItemId },
      include: {
        modifierGroup: {
          include: { options: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
