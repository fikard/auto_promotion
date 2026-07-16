import type { PublishProvider, PublishOptions, PublishResult } from '../types';
import type { PromotionChannel, PromotContent } from '../../promotion/types';

export class DiscordProvider implements PublishProvider {
  name = 'discord';
  channel: PromotionChannel = 'discord';
  private webhookUrl: string | null = null;

  isAuthenticated(): boolean {
    return this.webhookUrl !== null;
  }

  async authenticate(config: Record<string, unknown>): Promise<void> {
    const url = config.webhookUrl as string;
    if (!url) throw new Error('Discord webhookUrl is required');
    this.webhookUrl = url;
  }

  async publish(content: PromotContent, options?: PublishOptions): Promise<PublishResult> {
    const url = options?.webhookUrl ?? this.webhookUrl;
    if (!url) {
      return { success: false, channel: this.channel, error: 'Discord webhookUrl not configured' };
    }

    const payload = {
      content: `**${content.title}**\n\n${content.body}`,
      embeds: [{
        title: content.title,
        description: content.body,
        url: content.url,
        color: 0x5865F2,
        footer: content.cta ? { text: content.cta } : undefined,
      }],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, channel: this.channel, error: `Discord API error: ${response.status} ${text}` };
      }

      return {
        success: true,
        channel: this.channel,
        postId: response.headers.get('x-message-id') ?? undefined,
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
