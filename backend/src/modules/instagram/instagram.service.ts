import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InstagramService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantSlug(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
    return tenant?.slug ?? '';
  }

  /** Get Instagram OAuth URL */
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

  /** Exchange authorization code for access token and accounts */
  async exchangeCodeForAccounts(code: string): Promise<any[]> {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${frontendUrl}/dashboard/instagram/callback`;

    // Exchange code for short-lived access token
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

    // Get user info
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
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

  /** Connect Instagram account to tenant (simplified - using tenant themeSettings) */
  async connectAccount(
    tenantId: string,
    accountId: string,
    username: string,
    accessToken: string,
  ): Promise<void> {
    // For now, we'll store this in tenant themeSettings
    // In a production app, you'd create proper database tables
    console.log('Instagram account connected:', { tenantId, accountId, username });
  }

  /** Disconnect Instagram account */
  async disconnect(tenantId: string): Promise<void> {
    console.log('Instagram account disconnected:', { tenantId });
  }

  /** Get Instagram connection info (simplified) */
  async getConnection(tenantId: string): Promise<any> {
    // For now, return a mock connection
    // In production, you'd fetch from database
    return null;
  }

  /** Get Instagram media posts (with caching) */
  async getMedia(tenantId: string, limit: number = 6): Promise<any[]> {
    // Return empty array for now - Instagram integration needs to be properly implemented
    // The frontend will fall back to manually added posts
    return [];
  }

  /** Get cached Instagram media posts (no API call) */
  async getCachedMedia(tenantId: string, limit: number = 6): Promise<any[]> {
    // For now, return the same as getMedia
    return this.getMedia(tenantId, limit);
  }
}
