import type { PublishProvider, PublishOptions, PublishResult } from '../types';
import type { PromotionChannel, PromotContent } from '../../promotion/types';

interface RedditConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  userAgent: string;
  defaultSubreddit?: string;
}

export class RedditProvider implements PublishProvider {
  name = 'reddit';
  channel: PromotionChannel = 'reddit';
  private config: RedditConfig | null = null;
  private accessToken: string | null = null;

  isAuthenticated(): boolean {
    return this.config !== null;
  }

  async authenticate(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as RedditConfig;
    await this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config) throw new Error('Reddit not configured');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.config.userAgent,
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.config.refreshToken)}`,
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async publish(content: PromotContent, options?: PublishOptions): Promise<PublishResult> {
    if (!this.config || !this.accessToken) {
      return { success: false, channel: this.channel, error: 'Reddit not authenticated' };
    }

    const subreddit = options?.subreddit ?? this.config.defaultSubreddit;
    if (!subreddit) {
      return { success: false, channel: this.channel, error: 'Reddit subreddit is required (set in options.subreddit or config.defaultSubreddit)' };
    }

    try {
      const body = new URLSearchParams({
        kind: 'self',
        sr: subreddit,
        title: content.title,
        text: `${content.body}\n\n${content.url ? `🔗 ${content.url}` : ''}`,
      });

      const response = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.config.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        // Token 过期 → 刷新重试
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.publish(content, options);
        }
        return { success: false, channel: this.channel, error: `Reddit API error: ${response.status} ${text}` };
      }

      const data = await response.json();
      const postUrl = data?.json?.data?.url ?? data?.json?.data?.name ?? undefined;

      return {
        success: !data?.json?.errors?.length,
        channel: this.channel,
        url: postUrl,
        postId: data?.json?.data?.name ?? undefined,
        error: data?.json?.errors?.[0]?.[1],
      };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
