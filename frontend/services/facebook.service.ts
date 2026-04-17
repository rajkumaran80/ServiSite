import { api } from './api';

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
}

export interface FacebookConnection {
  pageId: string;
  pageName: string;
  expiresAt: string | null;
}

const facebookService = {
  /** Get the Facebook OAuth URL */
  async getAuthUrl(): Promise<string> {
    const res = await api.get<{ data: { url: string } }>('/facebook/auth-url');
    return res.data.data.url;
  },

  /** Exchange authorization code for pages list */
  async exchangeCode(code: string): Promise<FacebookPage[]> {
    const res = await api.post<{ data: FacebookPage[] }>('/facebook/exchange', { code });
    return res.data.data;
  },

  /** Save the selected page */
  async connectPage(page: FacebookPage): Promise<void> {
    await api.post('/facebook/connect', {
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
    });
  },

  /** Disconnect Facebook */
  async disconnect(): Promise<void> {
    await api.delete('/facebook/disconnect');
  },

  /** Get current connection status */
  async getConnection(): Promise<FacebookConnection | null> {
    const res = await api.get<{ data: FacebookConnection | null }>('/facebook/connection');
    return res.data.data;
  },

  /** Generate AI post text */
  async generatePostText(params: {
    businessName: string;
    itemName: string;
    itemDescription?: string;
    itemPrice?: string;
    customNote?: string;
  }): Promise<string> {
    const res = await api.post<{ data: { text: string } }>('/facebook/generate-post', params);
    return res.data.data.text;
  },

  /** Post to Facebook page */
  async post(message: string, imageUrl?: string): Promise<{ postId: string; postUrl: string }> {
    const res = await api.post<{ data: { postId: string; postUrl: string } }>('/facebook/post', {
      message,
      imageUrl,
    });
    return res.data.data;
  },
};

export default facebookService;
