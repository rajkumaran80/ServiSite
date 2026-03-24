import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get contact information for a tenant (public)' })
  async getContact(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const contact = await this.contactService.getOrCreate(tenantId);
    return { data: contact, success: true };
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact information' })
  async updateContact(
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: any,
    @Tenant('slug') slug: string,
  ) {
    const contact = await this.contactService.upsert(user.tenantId, dto, slug);
    return { data: contact, success: true, message: 'Contact information updated' };
  }
}
