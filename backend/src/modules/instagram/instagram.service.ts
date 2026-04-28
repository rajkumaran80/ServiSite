import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const GRAPH = 'https://graph.facebook.com/v20.0';
const MEDIA_FIELDS = 'id,caption,media_url,thumbnail_url,media_type,permalink,timestamp';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get appId() { return this.config.get<string>('FACEBOOK_APP_ID', ''); }
  private get appSecret() { return this.config.get<string>('FACEBOOK_APP_SECRET', ''); }
  private get redirectUri() {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `${base}/dashboard/instagram/callback`;
  }

  async getTenantSlug(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
    return tenant?.slug ?? '';
  }

  /** OAuth URL — uses Facebook Login with Instagram scopes */
  getAuthUrl(tenantSlug: string): string {
    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
    ].join(',');

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope,
      response_type: 'code',
      auth_type: 'rerequest',
      state: tenantSlug,
    });

    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange code → long-lived user token → pages → Instagram business accounts.
   * Returns one entry per page that has a linked Instagram Business Account.
   */
  async exchangeCodeForAccounts(code: string): Promise<any[]> {
    // Step 1: short-lived user token
    const tokenUrl = `${GRAPH}/oauth/access_token?` + new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: this.redirectUri,
      code,
    });
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new BadRequestException(`Token exchange failed: ${tokenData.error.message}`);
    const shortToken: string = tokenData.access_token;

    // Step 2: long-lived user token
    const longTokenUrl = `${GRAPH}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortToken,
    });
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json() as any;
    if (longTokenData.error) throw new BadRequestException(`Long-lived token failed: ${longTokenData.error.message}`);
    const userToken: string = longTokenData.access_token;

    // Step 3: pages the user manages (each has its own never-expiring page token)
    const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
    const pagesData = await pagesRes.json() as any;
    if (pagesData.error) throw new BadRequestException(`Failed to fetch pages: ${pagesData.error.message}`);
    const pages: any[] = pagesData.data ?? [];

    // Step 4: for each page, get the linked Instagram Business Account
    const accounts: any[] = [];
    for (const page of pages) {
      try {
        const igRes = await fetch(
          `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        );
        const igData = await igRes.json() as any;
        const igAccount = igData.instagram_business_account;
        if (!igAccount?.id) continue;

        // Get Instagram username
        const profileRes = await fetch(
          `${GRAPH}/${igAccount.id}?fields=id,username&access_token=${page.access_token}`,
        );
        const profile = await profileRes.json() as any;

        accounts.push({
          id: igAccount.id,               // Instagram Business Account ID
          username: profile.username ?? page.name,
          pageId: page.id,
          pageToken: page.access_token,   // page token is used for all IG Graph API calls
        });
      } catch (err) {
        this.logger.warn(`No Instagram account on page ${page.id}: ${err.message}`);
      }
    }

    return accounts;
  }

  /** Store the selected Instagram account (linked via Facebook page token) */
  async connectAccount(
    tenantId: string,
    accountId: string,
    username: string,
    accessToken: string, // this is the Facebook page access token
  ): Promise<void> {
    // Page tokens don't expire — set expiry far in the future
    const tokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await this.prisma.instagramConnection.upsert({
      where: { tenantId },
      create: { tenantId, accountId, username, accessToken, tokenExpiry },
      update: { accountId, username, accessToken, tokenExpiry },
    });

    await this.prisma.instagramMediaCache.deleteMany({ where: { tenantId } });
    this.logger.log(`Instagram connected for tenant ${tenantId}: @${username} (ig_id: ${accountId})`);
  }

  async disconnect(tenantId: string): Promise<void> {
    await this.prisma.instagramConnection.deleteMany({ where: { tenantId } });
    await this.prisma.instagramMediaCache.deleteMany({ where: { tenantId } });
    this.logger.log(`Instagram disconnected for tenant ${tenantId}`);
  }

  async getConnection(tenantId: string): Promise<any> {
    const conn = await this.prisma.instagramConnection.findUnique({ where: { tenantId } });
    if (!conn) return null;
    return { accountId: conn.accountId, username: conn.username, tokenExpiry: conn.tokenExpiry };
  }

  /** Fetch posts — uses cache, refreshes from Instagram Graph API via page token */
  async getMedia(tenantId: string, limit = 6): Promise<any[]> {
    const conn = await this.prisma.instagramConnection.findUnique({ where: { tenantId } });
    if (!conn) return [];

    // Return from cache if still fresh
    const cache = await this.prisma.instagramMediaCache.findUnique({ where: { tenantId } });
    if (cache && cache.expiresAt > new Date()) {
      return (cache.posts as any[]).slice(0, limit);
    }

    // Fetch fresh from Instagram Graph API using page access token
    try {
      const res = await fetch(
        `${GRAPH}/${conn.accountId}/media?fields=${MEDIA_FIELDS}&limit=20&access_token=${conn.accessToken}`,
      );

      if (!res.ok) {
        const err = await res.json() as any;
        this.logger.error(`Instagram Graph API error: ${JSON.stringify(err)}`);
        return cache ? (cache.posts as any[]).slice(0, limit) : [];
      }

      const data = await res.json() as any;
      const posts = (data.data || []).map((item: any) => ({
        id: item.id,
        caption: item.caption || '',
        imageUrl: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
        videoUrl: item.media_type === 'VIDEO' ? item.media_url : undefined,
        isVideo: item.media_type === 'VIDEO',
        postUrl: item.permalink,
        timestamp: item.timestamp,
      }));

      await this.prisma.instagramMediaCache.upsert({
        where: { tenantId },
        create: { tenantId, posts, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
        update: { posts, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
      });

      return posts.slice(0, limit);
    } catch (err) {
      this.logger.error(`Failed to fetch Instagram media: ${err.message}`);
      return cache ? (cache.posts as any[]).slice(0, limit) : [];
    }
  }

  async getCachedMedia(tenantId: string, limit = 6): Promise<any[]> {
    return this.getMedia(tenantId, limit);
  }

  async getMediaBySlug(slug: string, limit = 6): Promise<any[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!tenant) return [];
    return this.getMedia(tenant.id, limit);
  }

  /** Post a photo or video to Instagram (two-step: create container → publish) */
  async postToInstagram(
    tenantId: string,
    imageUrl: string,
    caption: string,
  ): Promise<{ postId: string; postUrl: string }> {
    const conn = await this.prisma.instagramConnection.findUnique({ where: { tenantId } });
    if (!conn) throw new BadRequestException('Instagram not connected');

    const igId = conn.accountId;
    const token = conn.accessToken;

    // Step 1: create media container
    const containerRes = await fetch(`${GRAPH}/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    });
    const container = await containerRes.json() as any;
    if (container.error) throw new BadRequestException(`Instagram container failed: ${container.error.message}`);

    // Step 2: publish
    const publishRes = await fetch(`${GRAPH}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const published = await publishRes.json() as any;
    if (published.error) throw new BadRequestException(`Instagram publish failed: ${published.error.message}`);

    // Clear cache so next fetch shows the new post
    await this.prisma.instagramMediaCache.deleteMany({ where: { tenantId } });

    return {
      postId: published.id,
      postUrl: `https://www.instagram.com/p/${published.id}/`,
    };
  }
}
