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
import { IsString, IsOptional, IsInt, Min, IsUrl } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class AddGalleryImageDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

class UpdateGalleryImageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

@ApiTags('gallery')
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all gallery images for a tenant (public)' })
  async findAll(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const images = await this.galleryService.findAll(tenantId);
    return { data: images, meta: { total: images.length }, success: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add image to gallery' })
  async addImage(@Body() dto: AddGalleryImageDto, @CurrentUser() user: any) {
    const image = await this.galleryService.addImage(user.tenantId, dto);
    return { data: image, success: true, message: 'Image added to gallery' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update gallery image' })
  async updateImage(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryImageDto,
    @CurrentUser() user: any,
  ) {
    const image = await this.galleryService.updateImage(user.tenantId, id, dto);
    return { data: image, success: true, message: 'Image updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete gallery image' })
  async deleteImage(@Param('id') id: string, @CurrentUser() user: any) {
    await this.galleryService.deleteImage(user.tenantId, id);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder gallery images' })
  async reorder(
    @Body() body: { items: Array<{ id: string; sortOrder: number }> },
    @CurrentUser() user: any,
  ) {
    await this.galleryService.reorder(user.tenantId, body.items);
    return { success: true, message: 'Gallery reordered' };
  }
}
