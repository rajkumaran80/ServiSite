import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const { adminEmail, adminPassword, ...tenantData } = createTenantDto;

    // Check slug uniqueness
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantData.slug },
    });

    if (existingTenant) {
      throw new ConflictException(`Tenant with slug '${tenantData.slug}' already exists`);
    }

    const passwordHash = await this.authService.hashPassword(adminPassword);

    const tenant = await this.prisma.tenant.create({
      data: {
        ...tenantData,
        themeSettings: tenantData.themeSettings || {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          fontFamily: 'Inter',
        },
        users: {
          create: {
            email: adminEmail.toLowerCase(),
            passwordHash,
            role: 'ADMIN',
          },
        },
        contactInfo: {
          create: {},
        },
      },
      include: {
        users: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { menuItems: true, gallery: true },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Tenant & { contactInfo: any; _count: any }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        contactInfo: true,
        _count: {
          select: { menuItems: true, gallery: true, categories: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${slug}' not found`);
    }

    return tenant;
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        contactInfo: true,
        _count: {
          select: { menuItems: true, gallery: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    await this.findById(id);

    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.tenant.delete({ where: { id } });
  }

  async getTenantStats(tenantId: string) {
    const [menuItemCount, categoryCount, galleryCount] = await Promise.all([
      this.prisma.menuItem.count({ where: { tenantId } }),
      this.prisma.category.count({ where: { tenantId } }),
      this.prisma.galleryImage.count({ where: { tenantId } }),
    ]);

    return {
      menuItems: menuItemCount,
      categories: categoryCount,
      galleryImages: galleryCount,
    };
  }
}
