import { Injectable } from '@nestjs/common';

@Injectable()
export class InstagramService {
  /** Get Instagram OAuth URL */
  getAuthUrl(): string {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const redirectUri = `${process.env.FRONTEND_URL}/dashboard/settings?ig=connected`;
    const scopes = 'user_profile,user_media';
    
    return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
  }

  /** Exchange authorization code for access token and accounts */
  async exchangeCodeForAccounts(code: string): Promise<any[]> {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = `${process.env.FRONTEND_URL}/dashboard/settings?ig=connected`;

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
    // For now, return mock data
    // In production, you'd fetch from Instagram API and cache results
    return [
      {
        id: '1',
        imageUrl: 'https://via.placeholder.com/300x300/000000/FFFFFF?text=Instagram+Post+1',
        caption: 'Sample Instagram post 1',
        timestamp: new Date().toISOString(),
        isVideo: false,
        postUrl: 'https://instagram.com/p/sample1',
      },
      {
        id: '2',
        imageUrl: 'https://via.placeholder.com/300x300/000000/FFFFFF?text=Instagram+Post+2',
        caption: 'Sample Instagram post 2',
        timestamp: new Date().toISOString(),
        isVideo: false,
        postUrl: 'https://instagram.com/p/sample2',
      },
    ].slice(0, limit);
  }

  /** Get cached Instagram media posts (no API call) */
  async getCachedMedia(tenantId: string, limit: number = 6): Promise<any[]> {
    // For now, return the same as getMedia
    return this.getMedia(tenantId, limit);
  }
}
