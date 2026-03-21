import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ─── Template seed data ──────────────────────────────────────────────────────

interface SeedGroup {
  name: string;
  icon: string;
  servedFrom?: string;
  servedUntil?: string;
  categories: {
    name: string;
    items: { name: string; price: number; description?: string; isPopular?: boolean }[];
  }[];
}

const TEMPLATE_DATA: Partial<Record<TenantType, SeedGroup[]>> = {
  RESTAURANT: [
    {
      name: 'Starters',
      icon: '🥗',
      categories: [
        {
          name: 'Soups & Salads',
          items: [
            { name: 'Tomato Soup', price: 4.50, description: 'Rich, velvety tomato soup with crusty bread' },
            { name: 'Caesar Salad', price: 6.50, description: 'Crisp romaine, parmesan, croutons, house dressing', isPopular: true },
            { name: 'Prawn Cocktail', price: 7.50, description: 'Classic prawn cocktail with Marie Rose sauce' },
          ],
        },
      ],
    },
    {
      name: 'Mains',
      icon: '🍽️',
      categories: [
        {
          name: 'Classic Dishes',
          items: [
            { name: 'Fish & Chips', price: 13.95, description: 'Beer-battered cod with chunky chips & mushy peas', isPopular: true },
            { name: 'Beef Burger', price: 11.50, description: '6oz beef patty, lettuce, tomato, pickles & fries' },
            { name: 'Grilled Chicken', price: 13.50, description: 'Herb-marinated chicken breast with roasted veg' },
            { name: 'Vegetable Risotto', price: 10.50, description: 'Creamy Arborio rice with seasonal vegetables' },
          ],
        },
      ],
    },
    {
      name: 'Desserts',
      icon: '🍮',
      categories: [
        {
          name: 'Sweet Treats',
          items: [
            { name: 'Chocolate Brownie', price: 5.50, description: 'Warm brownie with vanilla ice cream', isPopular: true },
            { name: 'New York Cheesecake', price: 5.95, description: 'Classic baked cheesecake with berry compote' },
            { name: 'Sticky Toffee Pudding', price: 5.50, description: 'Warm sponge with toffee sauce & clotted cream' },
          ],
        },
      ],
    },
    {
      name: 'Drinks',
      icon: '🥤',
      categories: [
        {
          name: 'Beverages',
          items: [
            { name: 'Soft Drink', price: 2.50, description: 'Coke, Diet Coke, Lemonade, or Juice' },
            { name: 'Sparkling Water', price: 2.00 },
            { name: 'House Wine (glass)', price: 5.50, description: 'Red or white' },
            { name: 'Draft Beer (pint)', price: 5.00 },
          ],
        },
      ],
    },
  ],

  CAFE: [
    {
      name: 'Hot Drinks',
      icon: '☕',
      categories: [
        {
          name: 'Coffee',
          items: [
            { name: 'Espresso', price: 2.50 },
            { name: 'Flat White', price: 3.00, isPopular: true },
            { name: 'Cappuccino', price: 3.20 },
            { name: 'Latte', price: 3.50 },
            { name: 'Americano', price: 2.80 },
            { name: 'Mocha', price: 3.80 },
          ],
        },
        {
          name: 'Tea',
          items: [
            { name: 'English Breakfast Tea', price: 2.50 },
            { name: 'Green Tea', price: 2.50 },
            { name: 'Herbal Tea', price: 2.50 },
          ],
        },
      ],
    },
    {
      name: 'Cold Drinks',
      icon: '🧋',
      categories: [
        {
          name: 'Iced & Cold',
          items: [
            { name: 'Iced Latte', price: 3.80, isPopular: true },
            { name: 'Iced Americano', price: 3.20 },
            { name: 'Fruit Smoothie', price: 4.50, description: 'Seasonal fruit blended to order' },
            { name: 'Fresh Orange Juice', price: 3.50 },
          ],
        },
      ],
    },
    {
      name: 'Food',
      icon: '🥐',
      categories: [
        {
          name: 'Pastries & Bakes',
          items: [
            { name: 'Butter Croissant', price: 2.50, isPopular: true },
            { name: 'Banana Bread', price: 3.00 },
            { name: 'Blueberry Muffin', price: 2.80 },
            { name: 'Cinnamon Roll', price: 3.50 },
          ],
        },
        {
          name: 'Sandwiches & Toasties',
          items: [
            { name: 'BLT', price: 5.50, description: 'Bacon, lettuce & tomato on sourdough' },
            { name: 'Avocado Toast', price: 6.50, description: 'Smashed avo, poached egg on sourdough', isPopular: true },
            { name: 'Club Sandwich', price: 7.00 },
          ],
        },
      ],
    },
  ],

  BARBER_SHOP: [
    {
      name: 'Haircuts',
      icon: '✂️',
      categories: [
        {
          name: "Men's Cuts",
          items: [
            { name: 'Classic Cut', price: 15, description: 'Scissor or clipper cut, styled to finish', isPopular: true },
            { name: 'Fade & Taper', price: 18, description: 'Skin fade or taper with styled top', isPopular: true },
            { name: 'Buzz Cut', price: 10, description: 'All-over clipper cut' },
            { name: "Kids Cut (under 12)", price: 10 },
          ],
        },
      ],
    },
    {
      name: 'Beard',
      icon: '🧔',
      categories: [
        {
          name: 'Beard Services',
          items: [
            { name: 'Beard Trim & Shape', price: 12, description: 'Trimmed and shaped to your style' },
            { name: 'Hot Towel Shave', price: 20, description: 'Traditional straight razor shave with hot towels', isPopular: true },
            { name: 'Beard Wash & Condition', price: 8 },
          ],
        },
      ],
    },
    {
      name: 'Packages',
      icon: '🎁',
      categories: [
        {
          name: 'Value Deals',
          items: [
            { name: 'Cut & Beard', price: 25, description: 'Classic cut + beard trim & shape', isPopular: true },
            { name: 'Full Groom', price: 35, description: 'Cut + hot towel shave + beard condition' },
          ],
        },
      ],
    },
  ],

  SALON: [
    {
      name: 'Hair',
      icon: '💇',
      categories: [
        {
          name: 'Cuts & Styling',
          items: [
            { name: "Women's Cut & Blow Dry", price: 45, isPopular: true },
            { name: "Men's Cut", price: 20 },
            { name: 'Blow Dry & Style', price: 25 },
            { name: 'Half Head Highlights', price: 75, description: 'Foil highlights, half head' },
            { name: 'Full Head Colour', price: 85, isPopular: true },
          ],
        },
      ],
    },
    {
      name: 'Nails',
      icon: '💅',
      categories: [
        {
          name: 'Nail Care',
          items: [
            { name: 'Classic Manicure', price: 20 },
            { name: 'Gel Manicure', price: 35, isPopular: true },
            { name: 'Classic Pedicure', price: 25 },
            { name: 'Gel Pedicure', price: 40 },
            { name: 'Nail Art (per nail)', price: 3 },
          ],
        },
      ],
    },
    {
      name: 'Beauty',
      icon: '✨',
      categories: [
        {
          name: 'Treatments',
          items: [
            { name: 'Eyebrow Shape & Wax', price: 12, isPopular: true },
            { name: 'Eyelash Tint', price: 18 },
            { name: 'Classic Facial', price: 45, description: 'Deep cleanse, exfoliate & moisturise' },
            { name: 'Express Facial', price: 30 },
          ],
        },
      ],
    },
  ],

  GYM: [
    {
      name: 'Memberships',
      icon: '🏋️',
      categories: [
        {
          name: 'Plans',
          items: [
            { name: 'Monthly Membership', price: 30, description: 'Full gym access, all equipment' },
            { name: '3-Month Membership', price: 80, description: 'Save £10 vs monthly', isPopular: true },
            { name: 'Annual Membership', price: 250, description: 'Best value — save £110 vs monthly' },
            { name: 'Day Pass', price: 8, description: 'Full access for one day' },
          ],
        },
      ],
    },
    {
      name: 'Personal Training',
      icon: '💪',
      categories: [
        {
          name: 'Sessions',
          items: [
            { name: 'Single PT Session (1hr)', price: 45 },
            { name: '5 PT Sessions', price: 200, description: 'Save £25', isPopular: true },
            { name: '10 PT Sessions', price: 380, description: 'Save £70' },
            { name: 'Online Coaching (monthly)', price: 60, description: 'Remote programme + check-ins' },
          ],
        },
      ],
    },
    {
      name: 'Classes',
      icon: '🧘',
      categories: [
        {
          name: 'Group Classes',
          items: [
            { name: 'Yoga', price: 10 },
            { name: 'Spin Cycle', price: 12, isPopular: true },
            { name: 'HIIT', price: 10, isPopular: true },
            { name: 'Pilates', price: 12 },
            { name: 'Boxing Fitness', price: 12 },
          ],
        },
      ],
    },
  ],
};

// ─── Theme presets ───────────────────────────────────────────────────────────

const TEMPLATE_THEMES: Partial<Record<TenantType, { primaryColor: string; secondaryColor: string; fontFamily: string }>> = {
  RESTAURANT: { primaryColor: '#DC2626', secondaryColor: '#991B1B', fontFamily: 'Inter' },
  CAFE:       { primaryColor: '#92400E', secondaryColor: '#78350F', fontFamily: 'Inter' },
  BARBER_SHOP:{ primaryColor: '#1D4ED8', secondaryColor: '#1E3A8A', fontFamily: 'Inter' },
  SALON:      { primaryColor: '#BE185D', secondaryColor: '#9D174D', fontFamily: 'Inter' },
  GYM:        { primaryColor: '#EA580C', secondaryColor: '#C2410C', fontFamily: 'Inter' },
  REPAIR_SHOP:{ primaryColor: '#475569', secondaryColor: '#1E293B', fontFamily: 'Inter' },
  OTHER:      { primaryColor: '#6366F1', secondaryColor: '#4338CA', fontFamily: 'Inter' },
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { slug: { not: 'platform' } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, menuItems: true } },
        users: {
          where: { role: UserRole.ADMIN },
          select: { email: true, createdAt: true },
          take: 1,
        },
      },
    });
    return tenants;
  }

  async createTenant(dto: {
    name: string;
    slug: string;
    type: TenantType;
    currency: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already taken`);

    const theme = TEMPLATE_THEMES[dto.type] || TEMPLATE_THEMES.OTHER;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        currency: dto.currency,
        themeSettings: theme,
      },
    });

    await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.adminEmail,
        passwordHash: await bcrypt.hash(dto.adminPassword, 12),
        role: UserRole.ADMIN,
      },
    });

    await this.applyTemplate(tenant.id, dto.type);

    return tenant;
  }

  private async applyTemplate(tenantId: string, type: TenantType) {
    const groups = TEMPLATE_DATA[type];
    if (!groups || groups.length === 0) return;

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
          data: {
            tenantId,
            menuGroupId: group.id,
            name: catDef.name,
            sortOrder: ci,
          },
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
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'platform') throw new ConflictException('Cannot delete platform tenant');
    await this.prisma.tenant.delete({ where: { id } });
  }

  async resetAdminPassword(tenantId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.ADMIN },
    });
    if (!user) throw new NotFoundException('Admin user not found');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
  }

  async getStats() {
    const [tenantCount, userCount, itemCount] = await Promise.all([
      this.prisma.tenant.count({ where: { slug: { not: 'platform' } } }),
      this.prisma.user.count({ where: { role: { not: UserRole.SUPER_ADMIN } } }),
      this.prisma.menuItem.count(),
    ]);
    return { tenantCount, userCount, itemCount };
  }
}
