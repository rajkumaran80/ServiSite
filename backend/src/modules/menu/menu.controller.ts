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

  // ---- Menu Groups ----

  @Public()
  @Get('groups')
  @ApiOperation({ summary: 'List all menu groups for a tenant' })
  async findAllGroups(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const groups = await this.menuService.findAllMenuGroups(tenantId);
    return { data: groups, success: true };
  }

  @Post('groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new menu group' })
  async createGroup(@Body() dto: CreateMenuGroupDto, @CurrentUser() user: any) {
    const group = await this.menuService.createMenuGroup(user.tenantId, dto);
    return { data: group, success: true, message: 'Menu group created' };
  }

  @Put('groups/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder menu groups' })
  async reorderGroups(
    @Body() body: { groups: Array<{ id: string; sortOrder: number }> },
    @CurrentUser() user: any,
  ) {
    await this.menuService.reorderGroups(user.tenantId, body.groups);
    return { success: true, message: 'Menu groups reordered' };
  }

  @Put('groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a menu group' })
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMenuGroupDto>,
    @CurrentUser() user: any,
  ) {
    const group = await this.menuService.updateMenuGroup(user.tenantId, id, dto);
    return { data: group, success: true, message: 'Menu group updated' };
  }

  @Delete('groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu group' })
  async deleteGroup(@Param('id') id: string, @CurrentUser() user: any) {
    await this.menuService.deleteMenuGroup(user.tenantId, id);
  }

  // ---- Categories ----

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List all categories for a tenant' })
  async findAllCategories(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const categories = await this.menuService.findAllCategories(tenantId);
    return { data: categories, success: true };
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: any) {
    const category = await this.menuService.createCategory(user.tenantId, dto);
    return { data: category, success: true, message: 'Category created' };
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
    @CurrentUser() user: any,
  ) {
    const category = await this.menuService.updateCategory(user.tenantId, id, dto);
    return { data: category, success: true, message: 'Category updated' };
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  async deleteCategory(@Param('id') id: string, @CurrentUser() user: any) {
    await this.menuService.deleteCategory(user.tenantId, id);
  }

  // ---- Menu Items ----

  @Public()
  @Get('items')
  @ApiOperation({ summary: 'List all menu items for a tenant' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  async findAllItems(
    @Tenant('id') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('available') available?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const isAvailable = available === 'true' ? true : available === 'false' ? false : undefined;
    const items = await this.menuService.findAllMenuItems(tenantId, { categoryId, isAvailable });
    return { data: items, meta: { total: items.length }, success: true };
  }

  @Public()
  @Get('full')
  @ApiOperation({ summary: 'Get full menu organized by groups and categories (public)' })
  async getFullMenu(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const menu = await this.menuService.findMenuByGroups(tenantId);
    return { data: menu, success: true };
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new menu item' })
  async createItem(@Body() dto: CreateMenuItemDto, @CurrentUser() user: any) {
    const item = await this.menuService.createMenuItem(user.tenantId, dto);
    return { data: item, success: true, message: 'Menu item created' };
  }

  @Public()
  @Get('items/:id')
  @ApiOperation({ summary: 'Get a single menu item' })
  async findOne(@Param('id') id: string, @Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const item = await this.menuService.findMenuItemById(tenantId, id);
    return { data: item, success: true };
  }

  @Put('items/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder menu items' })
  async reorderItems(
    @Body() body: { items: Array<{ id: string; sortOrder: number }> },
    @CurrentUser() user: any,
  ) {
    await this.menuService.reorderItems(user.tenantId, body.items);
    return { success: true, message: 'Items reordered' };
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a menu item' })
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: any,
  ) {
    const item = await this.menuService.updateMenuItem(user.tenantId, id, dto);
    return { data: item, success: true, message: 'Menu item updated' };
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu item' })
  async deleteItem(@Param('id') id: string, @CurrentUser() user: any) {
    await this.menuService.deleteMenuItem(user.tenantId, id);
  }
}
