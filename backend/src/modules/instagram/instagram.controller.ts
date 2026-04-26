import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstagramService } from './instagram.service';

@ApiTags('instagram')
@Controller('instagram')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  /** Returns the Instagram OAuth URL to redirect the user to */
  @Get('auth-url')
  @ApiOperation({ summary: 'Get Instagram OAuth URL' })
  async getAuthUrl(@CurrentUser() user: any) {
    const slug = await this.instagramService.getTenantSlug(user.tenantId);
    return { data: { url: this.instagramService.getAuthUrl(slug) }, success: true };
  }

  /** Exchange OAuth code → get accounts list */
  @Post('exchange')
  @ApiOperation({ summary: 'Exchange auth code for accounts list' })
  async exchange(@Body() body: { code: string }) {
    const accounts = await this.instagramService.exchangeCodeForAccounts(body.code);
    return { data: accounts, success: true };
  }

  /** Save the selected account for this tenant */
  @Post('connect')
  @ApiOperation({ summary: 'Save selected Instagram account' })
  async connect(
    @CurrentUser() user: any,
    @Body() body: { accountId: string; username: string; accessToken: string },
  ) {
    await this.instagramService.connectAccount(
      user.tenantId,
      body.accountId,
      body.username,
      body.accessToken,
    );
    return { data: { accountId: body.accountId, username: body.username }, success: true };
  }

  /** Remove Instagram connection */
  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect Instagram account' })
  async disconnect(@CurrentUser() user: any) {
    await this.instagramService.disconnect(user.tenantId);
    return { success: true };
  }

  /** Get current connection status */
  @Get('connection')
  @ApiOperation({ summary: 'Get Instagram connection info' })
  async getConnection(@CurrentUser() user: any) {
    const connection = await this.instagramService.getConnection(user.tenantId);
    return { data: connection, success: true };
  }

  /** Get Instagram media posts */
  @Get('media')
  @ApiOperation({ summary: 'Get Instagram media posts' })
  async getMedia(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    const media = await this.instagramService.getMedia(user.tenantId, limit || 6);
    return { data: media, success: true };
  }

  /** Get cached Instagram media posts */
  @Get('media/cached')
  @ApiOperation({ summary: 'Get cached Instagram media posts' })
  async getCachedMedia(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    const media = await this.instagramService.getCachedMedia(user.tenantId, limit || 6);
    return { data: media, success: true };
  }
}
