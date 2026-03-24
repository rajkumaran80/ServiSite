import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuGroupDto } from './dto/create-menu-group.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ── Menu Groups ────────────────────────────────────────────────────────────

  @Public()
  @Get('groups')
  async findAllGroups(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const groups = await this.menuService.findAllMenuGroups(tenantId);
    return { data: groups, success: true };
  }

  @Post('groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createGroup(@Body() dto: CreateMenuGroupDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const group = await this.menuService.createMenuGroup(user.tenantId, dto, slug);
    return { data: group, success: true, message: 'Menu group created' };
  }

  @Put('groups/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async reorderGroups(@Body() body: { groups: Array<{ id: string; sortOrder: number }> }, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    await this.menuService.reorderGroups(user.tenantId, body.groups, slug);
    return { success: true, message: 'Menu groups reordered' };
  }

  @Put('groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateGroup(@Param('id') id: string, @Body() dto: Partial<CreateMenuGroupDto>, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const group = await this.menuService.updateMenuGroup(user.tenantId, id, dto, slug);
    return { data: group, success: true, message: 'Menu group updated' };
  }

  @Delete('groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id') id: string, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    await this.menuService.deleteMenuGroup(user.tenantId, id, slug);
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  @Public()
  @Get('categories')
  async findAllCategories(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const categories = await this.menuService.findAllCategories(tenantId);
    return { data: categories, success: true };
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const category = await this.menuService.createCategory(user.tenantId, dto, slug);
    return { data: category, success: true, message: 'Category created' };
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const category = await this.menuService.updateCategory(user.tenantId, id, dto, slug);
    return { data: category, success: true, message: 'Category updated' };
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    await this.menuService.deleteCategory(user.tenantId, id, slug);
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────

  @Public()
  @Get('items')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  async findAllItems(@Tenant('id') tenantId: string, @Query('categoryId') categoryId?: string, @Query('available') available?: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const isAvailable = available === 'true' ? true : available === 'false' ? false : undefined;
    const items = await this.menuService.findAllMenuItems(tenantId, { categoryId, isAvailable });
    return { data: items, meta: { total: items.length }, success: true };
  }

  @Public()
  @Get('full')
  async getFullMenu(@Tenant('id') tenantId: string, @Tenant('slug') slug: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const menu = await this.menuService.findMenuByGroups(tenantId, slug);
    return { data: menu, success: true };
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createItem(@Body() dto: CreateMenuItemDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const item = await this.menuService.createMenuItem(user.tenantId, dto, slug);
    return { data: item, success: true, message: 'Menu item created' };
  }

  @Public()
  @Get('items/:id')
  async findOne(@Param('id') id: string, @Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const item = await this.menuService.findMenuItemById(tenantId, id);
    return { data: item, success: true };
  }

  @Put('items/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async reorderItems(@Body() body: { items: Array<{ id: string; sortOrder: number }> }, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    await this.menuService.reorderItems(user.tenantId, body.items, slug);
    return { success: true, message: 'Items reordered' };
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const item = await this.menuService.updateMenuItem(user.tenantId, id, dto, slug);
    return { data: item, success: true, message: 'Menu item updated' };
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(@Param('id') id: string, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    await this.menuService.deleteMenuItem(user.tenantId, id, slug);
  }
}
