import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ModifiersService } from './modifiers.service';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { CreateModifierOptionDto } from './dto/create-modifier-option.dto';
import { AssignModifiersDto } from './dto/assign-modifiers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@ApiTags('modifiers')
@Controller('modifiers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModifiersController {
  constructor(private service: ModifiersService) {}

  // ── Groups ──────────────────────────────────────────────────────────────

  @Get('groups')
  async getGroups(@Tenant('id') tenantId: string) {
    return { data: await this.service.getGroups(tenantId), success: true };
  }

  @Post('groups')
  async createGroup(@Tenant('id') tenantId: string, @Body() dto: CreateModifierGroupDto) {
    return { data: await this.service.createGroup(tenantId, dto), success: true };
  }

  @Put('groups/:id')
  async updateGroup(
    @Tenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateModifierGroupDto,
  ) {
    return { data: await this.service.updateGroup(tenantId, id, dto), success: true };
  }

  @Delete('groups/:id')
  async deleteGroup(@Tenant('id') tenantId: string, @Param('id') id: string) {
    await this.service.deleteGroup(tenantId, id);
    return { success: true };
  }

  // ── Options ─────────────────────────────────────────────────────────────

  @Post('groups/:groupId/options')
  async addOption(
    @Tenant('id') tenantId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return { data: await this.service.addOption(tenantId, groupId, dto), success: true };
  }

  @Put('options/:id')
  async updateOption(
    @Tenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return { data: await this.service.updateOption(tenantId, id, dto), success: true };
  }

  @Delete('options/:id')
  async deleteOption(@Tenant('id') tenantId: string, @Param('id') id: string) {
    await this.service.deleteOption(tenantId, id);
    return { success: true };
  }

  // ── Assign groups to a menu item ────────────────────────────────────────

  @Put('menu-item/:menuItemId')
  async assignToMenuItem(
    @Tenant('id') tenantId: string,
    @Param('menuItemId') menuItemId: string,
    @Body() dto: AssignModifiersDto,
  ) {
    return { data: await this.service.assignToMenuItem(tenantId, menuItemId, dto), success: true };
  }
}
