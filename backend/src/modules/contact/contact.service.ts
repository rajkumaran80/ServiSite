import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactInfo } from '@prisma/client';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<ContactInfo | null> {
    return this.prisma.contactInfo.findUnique({
      where: { tenantId },
    });
  }

  async upsert(tenantId: string, dto: UpdateContactDto): Promise<ContactInfo> {
    return this.prisma.contactInfo.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...dto,
      },
      update: dto,
    });
  }

  async getOrCreate(tenantId: string): Promise<ContactInfo> {
    const existing = await this.findByTenantId(tenantId);
    if (existing) return existing;

    return this.prisma.contactInfo.create({
      data: { tenantId },
    });
  }
}
