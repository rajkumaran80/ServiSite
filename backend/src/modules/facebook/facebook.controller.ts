import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FacebookService } from './facebook.service';

@ApiTags('facebook')
@Controller('facebook')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  /** Returns the Facebook OAuth URL to redirect the user to */
  @Get('auth-url')
  @ApiOperation({ summary: 'Get Facebook OAuth URL' })
  getAuthUrl() {
    return { data: { url: this.facebookService.getAuthUrl() }, success: true };
  }

  /** Exchange OAuth code → get manageable pages list */
  @Post('exchange')
  @ApiOperation({ summary: 'Exchange auth code for pages list' })
  async exchange(@Body() body: { code: string }) {
    const pages = await this.facebookService.exchangeCodeForPages(body.code);
    return { data: pages, success: true };
  }

  /** Save the selected page for this tenant */
  @Post('connect')
  @ApiOperation({ summary: 'Save selected Facebook page' })
  async connect(
    @CurrentUser() user: any,
    @Body() body: { pageId: string; pageName: string; pageAccessToken: string },
  ) {
    await this.facebookService.connectPage(
      user.tenantId,
      body.pageId,
      body.pageName,
      body.pageAccessToken,
    );
    return { data: { pageId: body.pageId, pageName: body.pageName }, success: true };
  }

  /** Remove Facebook connection */
  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect Facebook page' })
  async disconnect(@CurrentUser() user: any) {
    await this.facebookService.disconnect(user.tenantId);
    return { success: true };
  }

  /** Get current connection status */
  @Get('connection')
  @ApiOperation({ summary: 'Get Facebook connection info' })
  async getConnection(@CurrentUser() user: any) {
    const connection = await this.facebookService.getConnection(user.tenantId);
    return { data: connection, success: true };
  }

  /** Generate AI post text for a menu item */
  @Post('generate-post')
  @ApiOperation({ summary: 'AI-generate Facebook post text for a menu item' })
  async generatePost(
    @CurrentUser() user: any,
    @Body()
    body: {
      businessName: string;
      itemName: string;
      itemDescription?: string;
      itemPrice?: string;
      customNote?: string;
    },
  ) {
    const text = await this.facebookService.generatePostText(body);
    return { data: { text }, success: true };
  }

  /** Post to the connected Facebook page */
  @Post('post')
  @ApiOperation({ summary: 'Post to Facebook page' })
  async post(
    @CurrentUser() user: any,
    @Body() body: { message: string; imageUrl?: string },
  ) {
    const result = await this.facebookService.postToPage(
      user.tenantId,
      body.message,
      body.imageUrl,
    );
    return { data: result, success: true };
  }
}
