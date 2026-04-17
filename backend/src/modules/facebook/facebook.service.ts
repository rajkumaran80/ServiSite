import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
}

export interface PostToPagePayload {
  message: string;
  imageUrl?: string;
}

@Injectable()
export class FacebookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get appId() {
    return this.config.get<string>('FACEBOOK_APP_ID', '');
  }

  private get appSecret() {
    return this.config.get<string>('FACEBOOK_APP_SECRET', '');
  }

  private get redirectUri() {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `${frontendUrl}/dashboard/facebook/callback`;
  }

  private get anthropicKey() {
    return this.config.get<string>('ANTHROPIC_API_KEY', '');
  }

  /** Returns the Facebook OAuth dialog URL */
  getAuthUrl(): string {
    const scope = 'pages_manage_posts,pages_read_engagement,pages_show_list';
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope,
      response_type: 'code',
      auth_type: 'rerequest',
    });
    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for a long-lived user token,
   * then fetch all pages the user manages.
   */
  async exchangeCodeForPages(code: string): Promise<FacebookPage[]> {
    // Step 1: exchange code for short-lived user token
    const tokenUrl =
      `https://graph.facebook.com/v20.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      }).toString();

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) {
      throw new BadRequestException(`Facebook token exchange failed: ${tokenData.error.message}`);
    }
    const shortToken: string = tokenData.access_token;

    // Step 2: exchange for long-lived token
    const longTokenUrl =
      `https://graph.facebook.com/v20.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortToken,
      }).toString();

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json() as any;
    if (longTokenData.error) {
      throw new BadRequestException(`Long-lived token exchange failed: ${longTokenData.error.message}`);
    }
    const longToken: string = longTokenData.access_token;

    // Step 3: fetch pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${longToken}&fields=id,name,category,access_token`,
    );
    const pagesData = await pagesRes.json() as any;
    if (pagesData.error) {
      throw new BadRequestException(`Failed to fetch pages: ${pagesData.error.message}`);
    }

    return (pagesData.data ?? []) as FacebookPage[];
  }

  /** Save the selected page connection for a tenant */
  async connectPage(
    tenantId: string,
    pageId: string,
    pageName: string,
    pageAccessToken: string,
  ) {
    // Page access tokens from /me/accounts are long-lived (don't expire for pages)
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        facebookPageId: pageId,
        facebookPageName: pageName,
        facebookAccessToken: pageAccessToken,
        facebookTokenExpiry: null, // page tokens don't expire
      },
    });
  }

  /** Remove Facebook connection for a tenant */
  async disconnect(tenantId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        facebookPageId: null,
        facebookPageName: null,
        facebookAccessToken: null,
        facebookTokenExpiry: null,
      },
    });
  }

  /** Get current Facebook connection info (without exposing the token) */
  async getConnection(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { facebookPageId: true, facebookPageName: true, facebookTokenExpiry: true },
    });
    if (!tenant?.facebookPageId) return null;
    return {
      pageId: tenant.facebookPageId,
      pageName: tenant.facebookPageName,
      expiresAt: tenant.facebookTokenExpiry,
    };
  }

  /** Use Claude AI to generate a Facebook post for a menu item */
  async generatePostText(params: {
    businessName: string;
    itemName: string;
    itemDescription?: string;
    itemPrice?: string;
    customNote?: string;
  }): Promise<string> {
    if (!this.anthropicKey) {
      // Fallback if no API key configured
      const parts = [`✨ ${params.itemName}`, params.itemDescription, params.itemPrice ? `🏷️ ${params.itemPrice}` : null, params.customNote];
      return parts.filter(Boolean).join('\n\n') + `\n\n📍 Visit us at ${params.businessName}!`;
    }

    const prompt = `Write a short, engaging Facebook post for a food/service business to promote a menu item.
Business: ${params.businessName}
Item: ${params.itemName}
${params.itemDescription ? `Description: ${params.itemDescription}` : ''}
${params.itemPrice ? `Price: ${params.itemPrice}` : ''}
${params.customNote ? `Special note to include: ${params.customNote}` : ''}

Requirements:
- Keep it under 150 words
- Use 2-3 relevant emojis naturally
- Include a call to action
- Make it feel genuine, not corporate
- Do not use hashtags
- Just return the post text, no quotes or labels`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json() as any;
    if (data.error) {
      throw new InternalServerErrorException(`AI generation failed: ${data.error.message}`);
    }
    return data.content?.[0]?.text?.trim() ?? '';
  }

  /** Post to a Facebook page. Returns the post permalink. */
  async postToPage(
    tenantId: string,
    message: string,
    imageUrl?: string,
  ): Promise<{ postId: string; postUrl: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { facebookPageId: true, facebookAccessToken: true },
    });

    if (!tenant?.facebookPageId || !tenant.facebookAccessToken) {
      throw new BadRequestException('Facebook page not connected');
    }

    const pageId = tenant.facebookPageId;
    const token = tenant.facebookAccessToken;

    let endpoint: string;
    let body: Record<string, string>;

    if (imageUrl) {
      // Post with photo
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`;
      body = { url: imageUrl, message, access_token: token };
    } else {
      // Text-only post
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      body = { message, access_token: token };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;
    if (data.error) {
      throw new BadRequestException(`Facebook post failed: ${data.error.message}`);
    }

    // Build post URL from returned id
    // Photo: { id: "photo_id", post_id: "page_id_post_id" }
    // Feed:  { id: "page_id_post_id" }
    const rawId: string = data.post_id ?? data.id;
    // Normalise: "12345_67890" → "https://facebook.com/12345/posts/67890"
    const parts = rawId.split('_');
    const postUrl =
      parts.length === 2
        ? `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`
        : `https://www.facebook.com/${pageId}`;

    return { postId: rawId, postUrl };
  }
}
