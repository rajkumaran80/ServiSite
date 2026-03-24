import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactInfo } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
  ) {}

  async findByTenantId(tenantId: string): Promise<ContactInfo | null> {
    return this.prisma.contactInfo.findUnique({ where: { tenantId } });
  }

  async upsert(tenantId: string, dto: UpdateContactDto, slug: string): Promise<ContactInfo> {
    const contact = await this.prisma.contactInfo.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
    await this.tenantCache.invalidate(slug, 'contact', 'profile'); // profile includes contactInfo
    this.notify.revalidate(slug, ['contact', 'tenant']);
    return contact;
  }

  async getOrCreate(tenantId: string): Promise<ContactInfo> {
    const existing = await this.findByTenantId(tenantId);
    if (existing) return existing;
    return this.prisma.contactInfo.create({ data: { tenantId } });
  }
}
