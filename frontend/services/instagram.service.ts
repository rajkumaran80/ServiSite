import { api } from './api';

export interface InstagramAccount {
  id: string;        // Instagram Business Account ID
  username: string;
  pageId: string;    // Facebook Page ID
  pageToken: string; // Facebook Page access token (used for all Graph API calls)
}

export interface InstagramConnection {
  accountId: string;
  username: string;
  expiresAt: string | null;
}

const instagramService = {
  /** Get the Instagram OAuth URL */
  async getAuthUrl(): Promise<string> {
    const res = await api.get<{ data: { url: string } }>('/instagram/auth-url');
    return res.data.data.url;
  },

  /** Exchange authorization code for accounts list */
  async exchangeCode(code: string): Promise<InstagramAccount[]> {
    const res = await api.post<{ data: InstagramAccount[] }>('/instagram/exchange', { code });
    return res.data.data;
  },

  async connectAccount(account: InstagramAccount): Promise<void> {
    await api.post('/instagram/connect', {
      accountId: account.id,
      username: account.username,
      accessToken: account.pageToken,
    });
  },

  /** Disconnect Instagram */
  async disconnect(): Promise<void> {
    await api.delete('/instagram/disconnect');
  },

  /** Get current connection status */
  async getConnection(): Promise<InstagramConnection | null> {
    const res = await api.get<{ data: InstagramConnection | null }>('/instagram/connection');
    return res.data.data;
  },

  /** Get Instagram media posts */
  async getMedia(limit: number = 6): Promise<any[]> {
    const res = await api.get<{ data: any[] }>(`/instagram/media?limit=${limit}`);
    return res.data.data;
  },

  /** Get cached Instagram media posts */
  async getCachedMedia(limit: number = 6): Promise<any[]> {
    const res = await api.get<{ data: any[] }>(`/instagram/media/cached?limit=${limit}`);
    return res.data.data;
  },
};

export default instagramService;
