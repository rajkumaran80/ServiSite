import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MediaService, MediaType } from './media.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('media')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file to Azure Blob Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['logo', 'banner', 'menu', 'gallery', 'misc'],
    description: 'Type of media being uploaded',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, GIF, SVG). Max 10MB.',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') mediaType: MediaType = 'misc',
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use multipart/form-data with field name "file"');
    }

    const result = await this.mediaService.uploadFile(user.tenantId, file, mediaType);

    return {
      data: {
        url: result.url,
        blobName: result.blobName,
        contentType: result.contentType,
        size: result.size,
      },
      success: true,
      message: 'File uploaded successfully',
    };
  }
}
