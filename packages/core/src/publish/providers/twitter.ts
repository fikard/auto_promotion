import type { PublishProvider, PublishOptions, PublishResult } from '../types';
import type { PromotionChannel, PromotContent } from '../../promotion/types';

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export class TwitterProvider implements PublishProvider {
  name = 'twitter';
  channel: PromotionChannel = 'twitter';
  private config: TwitterConfig | null = null;

  isAuthenticated(): boolean {
    return this.config !== null;
  }

  async authenticate(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as TwitterConfig;
  }

  async publish(content: PromotContent, options?: PublishOptions): Promise<PublishResult> {
    if (!this.config) {
      return { success: false, channel: this.channel, error: 'Twitter not configured' };
    }

    // 构建 tweet 文本（截断到 280 字符）
    let text = content.title;
    if (content.body && text.length + content.body.length + 3 <= 280) {
      text = `${content.title}\n\n${content.body}`;
    }
    if (content.url && text.length + content.url.length + 2 <= 280) {
      text += `\n${content.url}`;
    }
    // 如果超 280 字符，截断标题
    if (text.length > 280) {
      text = text.slice(0, 277) + '...';
    }

    try {
      // X API v2 — 需要 OAuth 1.0a 签名
      // 这里使用简化的 Bearer Token 方式
      // 实际生产环境建议使用 oauth-1.0a 库签名
      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return {
          success: false,
          channel: this.channel,
          error: `Twitter API error: ${response.status} ${JSON.stringify(errorData)}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        channel: this.channel,
        postId: data?.data?.id,
        url: data?.data?.id ? `https://x.com/i/status/${data.data.id}` : undefined,
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
