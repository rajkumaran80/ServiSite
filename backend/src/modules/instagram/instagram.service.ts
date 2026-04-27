import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const GRAPH_API = 'https://graph.instagram.com';
const MEDIA_FIELDS = 'id,caption,media_url,thumbnail_url,media_type,permalink,timestamp';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // refresh when < 7 days remain

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTenantSlug(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
    return tenant?.slug ?? '';
  }

  getAuthUrl(tenantSlug: string): string {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${frontendUrl}/dashboard/instagram/callback`;
    const scopes = 'user_profile,user_media';
    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state: tenantSlug,
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForAccounts(code: string): Promise<any[]> {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${frontendUrl}/dashboard/instagram/callback`;

    const formData = new URLSearchParams();
    formData.append('client_id', clientId || '');
    formData.append('client_secret', clientSecret || '');
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Instagram authorization code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch(
      `${GRAPH_API}/me?fields=id,username,account_type&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      throw new Error('Failed to get Instagram user info');
    }

    const userData = await userResponse.json();

    return [{
      id: userData.id,
      username: userData.username,
      account_type: userData.account_type,
      access_token: accessToken,
    }];
  }

  async connectAccount(
    tenantId: string,
    accountId: string,
    username: string,
    accessToken: string,
  ): Promise<void> {
    // Exchange short-lived token (1 hour) for long-lived token (60 days)
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    let longLivedToken = accessToken;
    let tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // fallback: 1 hour

    try {
      const res = await fetch(
        `${GRAPH_API}/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        longLivedToken = data.access_token;
        // expires_in is in seconds
        tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
      }
    } catch (err) {
      this.logger.warn(`Failed to exchange for long-lived token: ${err.message}`);
    }

    await this.prisma.instagramConnection.upsert({
      where: { tenantId },
      create: { tenantId, accountId, username, accessToken: longLivedToken, tokenExpiry },
      update: { accountId, username, accessToken: longLivedToken, tokenExpiry },
    });

    // Clear any stale media cache so next fetch gets fresh data
    await this.prisma.instagramMediaCache.deleteMany({ where: { tenantId } });

    this.logger.log(`Instagram connected for tenant ${tenantId}: @${username}`);
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

  async getMedia(tenantId: string, limit = 6): Promise<any[]> {
    const conn = await this.prisma.instagramConnection.findUnique({ where: { tenantId } });
    if (!conn) return [];

    // Refresh token if expiring within 7 days
    const token = await this.maybeRefreshToken(conn);

    // Check cache
    const cache = await this.prisma.instagramMediaCache.findUnique({ where: { tenantId } });
    if (cache && cache.expiresAt > new Date()) {
      const posts = cache.posts as any[];
      return posts.slice(0, limit);
    }

    // Fetch fresh from Instagram Graph API
    try {
      const res = await fetch(
        `${GRAPH_API}/me/media?fields=${MEDIA_FIELDS}&limit=20&access_token=${token}`
      );

      if (!res.ok) {
        const err = await res.json();
        this.logger.error(`Instagram API error: ${JSON.stringify(err)}`);
        return cache ? (cache.posts as any[]).slice(0, limit) : [];
      }

      const data = await res.json();
      const posts = (data.data || []).map((item: any) => ({
        id: item.id,
        caption: item.caption || '',
        imageUrl: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
        videoUrl: item.media_type === 'VIDEO' ? item.media_url : undefined,
        isVideo: item.media_type === 'VIDEO',
        postUrl: item.permalink,
        timestamp: item.timestamp,
      }));

      // Write to cache
      await this.prisma.instagramMediaCache.upsert({
        where: { tenantId },
        create: {
          tenantId,
          posts,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
        update: {
          posts,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
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

  private async maybeRefreshToken(conn: { tenantId: string; accessToken: string; tokenExpiry: Date }): Promise<string> {
    const timeRemaining = conn.tokenExpiry.getTime() - Date.now();

    if (timeRemaining > TOKEN_REFRESH_THRESHOLD_MS) {
      return conn.accessToken;
    }

    try {
      const res = await fetch(
        `${GRAPH_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${conn.accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        const newExpiry = new Date(Date.now() + data.expires_in * 1000);
        await this.prisma.instagramConnection.update({
          where: { tenantId: conn.tenantId },
          data: { accessToken: data.access_token, tokenExpiry: newExpiry },
        });
        this.logger.log(`Refreshed Instagram token for tenant ${conn.tenantId}`);
        return data.access_token;
      }
    } catch (err) {
      this.logger.warn(`Failed to refresh Instagram token: ${err.message}`);
    }

    return conn.accessToken;
  }
}
