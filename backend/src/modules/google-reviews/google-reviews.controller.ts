import { Controller, Get, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GoogleReviewsService } from './google-reviews.service';
import { Public } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';

@ApiTags('google-reviews')
@Controller('google-reviews')
export class GoogleReviewsController {
  constructor(private readonly service: GoogleReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get Google reviews for the tenant (cached 24h)' })
  async getReviews(
    @Tenant('id') tenantId: string,
    @Tenant('slug') slug: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const reviews = await this.service.getReviews(tenantId, slug);
    return { data: reviews, success: true };
  }
}
