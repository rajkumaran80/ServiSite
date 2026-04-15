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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { MediaService } from '../media/media.service';
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
  constructor(
    private readonly galleryService: GalleryService,
    private readonly mediaService: MediaService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all gallery images for a tenant (public)' })
  async findAll(@Tenant('id') tenantId: string, @Tenant('slug') slug: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const images = await this.galleryService.findAll(tenantId, slug);
    return { data: images, meta: { total: images.length }, success: true };
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image or video to gallery (VALIDATE → OPTIMIZE → STORE → CDN)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 35 * 1024 * 1024, files: 1 }, // 35MB hard limit at multer (video max is 30MB)
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Tenant('slug') slug: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const result = await this.mediaService.uploadGalleryMedia(user.tenantId, file);
    const image = await this.galleryService.addImage(user.tenantId, {
      url: result.url,
      mediaType: result.mediaType,
      fileSize: result.size,
      blobName: result.blobName,
    }, slug);
    return { data: image, success: true, message: `${result.mediaType} uploaded and optimised` };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add image to gallery by URL (legacy — use /upload instead)' })
  async addImage(@Body() dto: AddGalleryImageDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const image = await this.galleryService.addImage(user.tenantId, dto, slug);
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
    @Tenant('slug') slug: string,
  ) {
    const image = await this.galleryService.updateImage(user.tenantId, id, dto, slug);
    return { data: image, success: true, message: 'Image updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete gallery image and its blob from storage' })
  async deleteImage(@Param('id') id: string, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const image = await this.galleryService.findById(user.tenantId, id);
    await this.galleryService.deleteImage(user.tenantId, id, slug);
    // Clean up blob and decrement storage counter
    if (image.blobName) {
      await this.mediaService.deleteGalleryBlob(image.blobName, image.fileSize, user.tenantId);
    }
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder gallery images' })
  async reorder(
    @Body() body: { items: Array<{ id: string; sortOrder: number }> },
    @CurrentUser() user: any,
    @Tenant('slug') slug: string,
  ) {
    await this.galleryService.reorder(user.tenantId, body.items, slug);
    return { success: true, message: 'Gallery reordered' };
  }
}
