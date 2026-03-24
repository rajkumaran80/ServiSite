import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateNavItemDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  href: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  openInNewTab?: boolean;
}

class UpdateNavItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  href?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  openInNewTab?: boolean;
}

@ApiTags('navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active navigation items for a tenant (public)' })
  async findAll(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const items = await this.navigationService.findAll(tenantId);
    return { data: items, success: true };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all navigation items for admin (includes inactive)' })
  async findAllAdmin(@CurrentUser() user: any) {
    const items = await this.navigationService.findAllAdmin(user.tenantId);
    return { data: items, success: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a navigation item' })
  async create(@Body() dto: CreateNavItemDto, @CurrentUser() user: any) {
    const item = await this.navigationService.create(user.tenantId, dto);
    return { data: item, success: true, message: 'Navigation item created' };
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder navigation items' })
  async reorder(
    @Body() body: { items: Array<{ id: string; sortOrder: number }> },
    @CurrentUser() user: any,
  ) {
    await this.navigationService.reorder(user.tenantId, body.items);
    return { success: true, message: 'Navigation reordered' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a navigation item' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNavItemDto,
    @CurrentUser() user: any,
  ) {
    const item = await this.navigationService.update(user.tenantId, id, dto);
    return { data: item, success: true, message: 'Navigation item updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a navigation item' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.navigationService.delete(user.tenantId, id);
  }
}
