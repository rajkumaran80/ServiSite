import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { CreateChoiceGroupDto } from './dto/create-choice-group.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { PlaceOrderDto, OrderLineDto } from './dto/place-order.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrderingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Choice Groups ────────────────────────────────────────────────────────

  async listChoiceGroups(tenantId: string) {
    return this.prisma.choiceGroup.findMany({
      where: { tenantId },
      include: { sources: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createChoiceGroup(tenantId: string, dto: CreateChoiceGroupDto) {
    return this.prisma.choiceGroup.create({
      data: {
        tenantId,
        name: dto.name,
        minSelection: dto.minSelection ?? 1,
        maxSelection: dto.maxSelection ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        sources: {
          create: dto.sources.map(s => ({
            sourceType: s.sourceType,
            sourceId: s.sourceId,
          })),
        },
      },
      include: { sources: true },
    });
  }

  async updateChoiceGroup(tenantId: string, id: string, dto: Partial<CreateChoiceGroupDto>) {
    await this.assertOwns(tenantId, 'choiceGroup', id);
    await this.prisma.choiceGroupSource.deleteMany({ where: { choiceGroupId: id } });
    return this.prisma.choiceGroup.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.minSelection !== undefined && { minSelection: dto.minSelection }),
        ...(dto.maxSelection !== undefined && { maxSelection: dto.maxSelection }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.sources && {
          sources: { create: dto.sources.map(s => ({ sourceType: s.sourceType, sourceId: s.sourceId })) },
        }),
      },
      include: { sources: true },
    });
  }

  async deleteChoiceGroup(tenantId: string, id: string) {
    await this.assertOwns(tenantId, 'choiceGroup', id);
    await this.prisma.choiceGroup.delete({ where: { id } });
  }

  // ─── Bundles ──────────────────────────────────────────────────────────────

  async listBundles(tenantId: string) {
    return this.prisma.bundle.findMany({
      where: { tenantId },
      include: {
        choiceGroups: {
          include: { choiceGroup: { include: { sources: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createBundle(tenantId: string, dto: CreateBundleDto) {
    return this.prisma.bundle.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        pricingType: dto.pricingType,
        basePrice: dto.basePrice != null ? new Decimal(dto.basePrice) : null,
        discountPct: dto.discountPct != null ? new Decimal(dto.discountPct) : null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        choiceGroups: {
          create: dto.choiceGroups.map(cg => ({
            choiceGroupId: cg.choiceGroupId,
            sortOrder: cg.sortOrder ?? 0,
          })),
        },
      },
      include: {
        choiceGroups: {
          include: { choiceGroup: { include: { sources: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async updateBundle(tenantId: string, id: string, dto: Partial<CreateBundleDto>) {
    await this.assertOwns(tenantId, 'bundle', id);
    if (dto.choiceGroups) {
      await this.prisma.bundleChoiceGroup.deleteMany({ where: { bundleId: id } });
    }
    return this.prisma.bundle.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.pricingType && { pricingType: dto.pricingType }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice != null ? new Decimal(dto.basePrice) : null }),
        ...(dto.discountPct !== undefined && { discountPct: dto.discountPct != null ? new Decimal(dto.discountPct) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.choiceGroups && {
          choiceGroups: {
            create: dto.choiceGroups.map(cg => ({ choiceGroupId: cg.choiceGroupId, sortOrder: cg.sortOrder ?? 0 })),
          },
        }),
      },
      include: {
        choiceGroups: {
          include: { choiceGroup: { include: { sources: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async deleteBundle(tenantId: string, id: string) {
    await this.assertOwns(tenantId, 'bundle', id);
    await this.prisma.bundle.delete({ where: { id } });
  }

  // ─── Pricing Rules ────────────────────────────────────────────────────────

  async listPricingRules(tenantId: string) {
    return this.prisma.pricingRule.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createPricingRule(tenantId: string, dto: CreatePricingRuleDto) {
    return this.prisma.pricingRule.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        condition: dto.condition,
        action: dto.action,
        priority: dto.priority ?? 0,
        stackable: dto.stackable ?? false,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePricingRule(tenantId: string, id: string, dto: Partial<CreatePricingRuleDto>) {
    await this.assertOwns(tenantId, 'pricingRule', id);
    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.condition && { condition: dto.condition }),
        ...(dto.action && { action: dto.action }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.stackable !== undefined && { stackable: dto.stackable }),
        ...(dto.validFrom !== undefined && { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }),
        ...(dto.validTo !== undefined && { validTo: dto.validTo ? new Date(dto.validTo) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deletePricingRule(tenantId: string, id: string) {
    await this.assertOwns(tenantId, 'pricingRule', id);
    await this.prisma.pricingRule.delete({ where: { id } });
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async listOrders(tenantId: string, status?: string) {
    return this.prisma.order.findMany({
      where: { tenantId, ...(status && { status: status as any }) },
      include: { lines: { include: { menuItem: true, bundle: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { menuItem: true, bundle: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(tenantId: string, id: string, status: string) {
    await this.assertOwns(tenantId, 'order', id);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
    });
    // Notify customer of status change
    this.notifications.notifyOrderStatus(tenantId, updated, status).catch(() => {});
    return updated;
  }

  // ─── Cart Compute (pricing engine) ────────────────────────────────────────

  async computeCart(tenantId: string, dto: PlaceOrderDto) {
    const { resolvedLines, subtotal } = await this.resolveLines(tenantId, dto.lines);
    const { discountAmt, appliedRules } = await this.applyRules(tenantId, resolvedLines, subtotal);
    const total = Math.max(0, subtotal - discountAmt);
    return { lines: resolvedLines, subtotal, discountAmt, total, appliedRules };
  }

  async placeOrder(tenantId: string, dto: PlaceOrderDto) {
    const { resolvedLines, subtotal } = await this.resolveLines(tenantId, dto.lines);
    const { discountAmt } = await this.applyRules(tenantId, resolvedLines, subtotal);
    const total = Math.max(0, subtotal - discountAmt);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        tableNumber: dto.tableNumber,
        notes: dto.notes,
        subtotal: new Decimal(subtotal.toFixed(2)),
        discountAmt: new Decimal(discountAmt.toFixed(2)),
        total: new Decimal(total.toFixed(2)),
        currency: tenant?.currency ?? 'GBP',
        lines: {
          create: resolvedLines.map(l => ({
            menuItemId: l.menuItemId ?? null,
            bundleId: l.bundleId ?? null,
            quantity: l.quantity,
            unitPrice: new Decimal(l.unitPrice.toFixed(2)),
            lineTotal: new Decimal(l.lineTotal.toFixed(2)),
            notes: l.notes ?? null,
            selections: l.selections ?? null,
          })),
        },
      },
      include: { lines: { include: { menuItem: true, bundle: true } } },
    });

    // Fire-and-forget order notifications
    this.notifications.notifyNewOrder(tenantId, order).catch(() => {});

    return order;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async resolveLines(tenantId: string, inputLines: OrderLineDto[]) {
    const resolvedLines: ResolvedLine[] = [];
    let subtotal = 0;

    for (const line of inputLines) {
      if (!line.menuItemId && !line.bundleId) {
        throw new BadRequestException('Each line must have menuItemId or bundleId');
      }

      if (line.menuItemId) {
        const item = await this.prisma.menuItem.findFirst({
          where: { id: line.menuItemId, tenantId, isAvailable: true },
        });
        if (!item) throw new BadRequestException(`Item ${line.menuItemId} not found or unavailable`);

        // Resolve modifier price adjustments
        let modifierAdj = 0;
        const resolvedModifiers: any[] = [];
        if (line.modifiers && line.modifiers.length > 0) {
          for (const mod of line.modifiers) {
            const group = await this.prisma.modifierGroup.findFirst({
              where: { id: mod.modifierGroupId, tenantId },
              include: { options: { where: { isAvailable: true } } },
            });
            if (!group) continue;

            const selectedOptions = group.options.filter(o => mod.optionIds.includes(o.id));
            if (group.required && selectedOptions.length === 0) {
              throw new BadRequestException(`Required modifier "${group.name}" not selected for item "${item.name}"`);
            }
            if (group.type === 'SINGLE_SELECT' && selectedOptions.length > 1) {
              throw new BadRequestException(`Only one option allowed for modifier "${group.name}"`);
            }
            if (group.maxSelect !== null && selectedOptions.length > group.maxSelect) {
              throw new BadRequestException(`Too many options selected for modifier "${group.name}"`);
            }

            for (const opt of selectedOptions) {
              modifierAdj += Number(opt.priceAdjustment);
            }
            resolvedModifiers.push({
              groupId: group.id,
              groupName: group.name,
              options: selectedOptions.map(o => ({
                optionId: o.id,
                optionName: o.name,
                priceAdj: Number(o.priceAdjustment),
              })),
            });
          }
        }

        const unitPrice = Number(item.price) + modifierAdj;
        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;
        resolvedLines.push({
          menuItemId: item.id,
          bundleId: null,
          name: item.name,
          quantity: line.quantity,
          unitPrice,
          lineTotal,
          notes: line.notes,
          selections: resolvedModifiers.length > 0 ? resolvedModifiers : null,
          categoryIds: await this.getItemCategoryIds(item.id),
          menuGroupIds: await this.getItemMenuGroupIds(item.id),
        });
      } else if (line.bundleId) {
        const bundle = await this.prisma.bundle.findFirst({
          where: { id: line.bundleId, tenantId, isActive: true },
          include: { choiceGroups: { include: { choiceGroup: true }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!bundle) throw new BadRequestException(`Bundle ${line.bundleId} not found or inactive`);

        let unitPrice = 0;
        if (bundle.pricingType === 'FIXED') {
          unitPrice = Number(bundle.basePrice ?? 0);
        } else {
          // SUM or DISCOUNTED — sum the selected items
          let selectionSum = 0;
          for (const sel of line.selections ?? []) {
            const selItem = await this.prisma.menuItem.findFirst({
              where: { id: sel.menuItemId, tenantId, isAvailable: true },
            });
            if (selItem) selectionSum += Number(selItem.price);
          }
          if (bundle.pricingType === 'DISCOUNTED' && bundle.discountPct) {
            unitPrice = selectionSum * (1 - Number(bundle.discountPct) / 100);
          } else {
            unitPrice = selectionSum;
          }
        }

        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;
        resolvedLines.push({
          menuItemId: null,
          bundleId: bundle.id,
          name: bundle.name,
          quantity: line.quantity,
          unitPrice,
          lineTotal,
          notes: line.notes,
          selections: line.selections ?? null,
          categoryIds: [],
          menuGroupIds: [],
        });
      }
    }

    return { resolvedLines, subtotal };
  }

  private async applyRules(tenantId: string, lines: ResolvedLine[], subtotal: number) {
    const now = new Date();
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
      },
      orderBy: { priority: 'desc' },
    });

    let discountAmt = 0;
    let nonStackableApplied = false;
    const appliedRules: string[] = [];

    for (const rule of rules) {
      if (!rule.stackable && nonStackableApplied) continue;

      const condition = rule.condition as any;
      const action = rule.action as any;
      let ruleDiscount = 0;

      if (rule.type === 'HAPPY_HOUR') {
        if (!this.isWithinTimeWindow(condition.timeBetween)) continue;
        const eligibleTotal = this.getEligibleTotal(lines, condition);
        ruleDiscount = eligibleTotal * ((action.discountPct ?? 0) / 100);

      } else if (rule.type === 'PERCENTAGE') {
        if (condition.minOrderTotal && subtotal < condition.minOrderTotal) continue;
        const eligibleTotal = this.getEligibleTotal(lines, condition);
        ruleDiscount = eligibleTotal * ((action.discountPct ?? 0) / 100);

      } else if (rule.type === 'FIXED_AMOUNT') {
        if (condition.minOrderTotal && subtotal < condition.minOrderTotal) continue;
        ruleDiscount = action.discountAmt ?? 0;

      } else if (rule.type === 'BOGO') {
        // Find matching lines and calculate free item value
        const matchingLines = lines.filter(l =>
          (condition.itemId && l.menuItemId === condition.itemId) ||
          (condition.categoryId && l.categoryIds.includes(condition.categoryId)),
        );
        for (const ml of matchingLines) {
          if (ml.quantity >= (condition.minQty ?? 1)) {
            const freeQty = action.freeQty ?? 1;
            ruleDiscount += ml.unitPrice * freeQty;
          }
        }
      }

      if (ruleDiscount > 0) {
        discountAmt += ruleDiscount;
        appliedRules.push(rule.name);
        if (!rule.stackable) nonStackableApplied = true;
      }
    }

    return { discountAmt: Math.min(discountAmt, subtotal), appliedRules };
  }

  private getEligibleTotal(lines: ResolvedLine[], condition: any): number {
    return lines.reduce((sum, l) => {
      const matchesCategory = !condition.categoryIds || l.categoryIds.some(c => condition.categoryIds.includes(c));
      const matchesGroup = !condition.menuGroupIds || l.menuGroupIds.some(g => condition.menuGroupIds.includes(g));
      const matchesItem = !condition.itemIds || (l.menuItemId && condition.itemIds.includes(l.menuItemId));
      if (matchesCategory && matchesGroup && matchesItem) return sum + l.lineTotal;
      return sum;
    }, 0);
  }

  private isWithinTimeWindow(timeBetween?: [string, string]): boolean {
    if (!timeBetween || timeBetween.length !== 2) return false;
    const now = new Date();
    const [startH, startM] = timeBetween[0].split(':').map(Number);
    const [endH, endM] = timeBetween[1].split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  private async getItemCategoryIds(menuItemId: string): Promise<string[]> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { categories: { select: { id: true } } },
    });
    return item?.categories.map(c => c.id) ?? [];
  }

  private async getItemMenuGroupIds(menuItemId: string): Promise<string[]> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { categories: { select: { menuGroupId: true } } },
    });
    return (item?.categories.map(c => c.menuGroupId).filter(Boolean) as string[]) ?? [];
  }

  private async assertOwns(tenantId: string, model: string, id: string) {
    const record = await (this.prisma as any)[model].findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException(`${model} not found`);
  }
}

export interface ResolvedLine {
  menuItemId: string | null;
  bundleId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  selections: any;
  categoryIds: string[];
  menuGroupIds: string[];
}
