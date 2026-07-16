import type { PublishProvider, PublishOptions, PublishResult } from '../types';
import type { PromotionChannel, PromotContent } from '../../promotion/types';

interface LinkedInConfig {
  accessToken: string;
  authorUrn: string;
}

export class LinkedInProvider implements PublishProvider {
  name = 'linkedin';
  channel: PromotionChannel = 'linkedin';
  private config: LinkedInConfig | null = null;

  isAuthenticated(): boolean {
    return this.config !== null;
  }

  async authenticate(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as LinkedInConfig;
  }

  async publish(content: PromotContent, options?: PublishOptions): Promise<PublishResult> {
    if (!this.config) {
      return { success: false, channel: this.channel, error: 'LinkedIn not configured' };
    }

    const authorUrn = options?.authorUrn ?? this.config.authorUrn;

    const payload = {
      author: authorUrn,
      commentary: `${content.title}\n\n${content.body}${content.url ? `\n\n${content.url}` : ''}`,
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
      distribution: {
        feedDistribution: 'MAIN_FEED',
      },
    };

    try {
      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return {
          success: false,
          channel: this.channel,
          error: `LinkedIn API error: ${response.status} ${JSON.stringify(errorData)}`,
        };
      }

      const postId = response.headers.get('x-restli-id') ?? undefined;

      return {
        success: true,
        channel: this.channel,
        postId,
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
