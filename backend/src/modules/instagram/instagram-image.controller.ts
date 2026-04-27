import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { InstagramImageService } from './instagram-image.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('instagram')
@Controller('instagram/image')
export class InstagramImageController {
  private readonly logger = new Logger(InstagramImageController.name);

  constructor(private readonly instagramImageService: InstagramImageService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get cached Instagram image' })
  async getCachedImage(@Param('id') id: string, @Res() res: Response) {
    try {
      const { data, contentType } = await this.instagramImageService.getCachedImage(id);
      
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'Access-Control-Allow-Origin': '*',
      });
      
      res.send(data);
    } catch (error) {
      this.logger.error(`Failed to serve cached image ${id}:`, error);
      res.status(HttpStatus.NOT_FOUND).send('Image not found');
    }
  }

  @Get('cache')
  @ApiOperation({ summary: 'Cache an Instagram image' })
  async cacheImage(@Res() res: Response) {
    const imageUrl = res.req.query.url as string;
    
    if (!imageUrl) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'URL parameter is required' });
    }

    try {
      const result = await this.instagramImageService.cacheInstagramImage(imageUrl);
      return res.json(result);
    } catch (error) {
      this.logger.error('Failed to cache image:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to cache image' });
    }
  }
}
