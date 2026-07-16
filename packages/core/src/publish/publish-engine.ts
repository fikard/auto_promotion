import type { PromotionChannel, PromotContent } from '../promotion/types';
import type { PublishProvider, PublishOptions, PublishResult, PublishChannelConfig } from './types';
import type { AnalyticsEvent, PlatformAdapter } from '../adapter';

export class PublishEngine {
  private providers = new Map<string, PublishProvider>();
  private channelConfig: PublishChannelConfig = {};
  private adapter: PlatformAdapter;
  private onEvent?: (event: AnalyticsEvent) => void;

  constructor(adapter: PlatformAdapter, channelConfig?: PublishChannelConfig, onEvent?: (event: AnalyticsEvent) => void) {
    this.adapter = adapter;
    if (channelConfig) this.channelConfig = channelConfig;
    this.onEvent = onEvent;
  }

  /** 注册发布提供商 */
  registerProvider(provider: PublishProvider): void {
    this.providers.set(provider.channel, provider);
  }

  /** 更新渠道配置 */
  configure(config: PublishChannelConfig): void {
    this.channelConfig = { ...this.channelConfig, ...config };
  }

  /** 获取已注册的渠道列表 */
  getAvailableChannels(): PromotionChannel[] {
    return Array.from(this.providers.keys()) as PromotionChannel[];
  }

  /** 检查渠道是否可用（已注册且已认证） */
  isAvailable(channel: PromotionChannel): boolean {
    const provider = this.providers.get(channel);
    return provider !== undefined && provider.isAuthenticated();
  }

  /** 发布到单个渠道 */
  async publish(channel: PromotionChannel, content: PromotContent, options?: PublishOptions): Promise<PublishResult> {
    const provider = this.providers.get(channel);

    // 无提供商 → 降级
    if (!provider) {
      return this.fallback(channel, content, 'no_provider');
    }

    // 未认证 → 尝试自动认证
    if (!provider.isAuthenticated()) {
      const config = this.getChannelAuthConfig(channel);
      if (config) {
        try {
          await provider.authenticate(config);
        } catch {
          return this.fallback(channel, content, 'auth_failed');
        }
      } else {
        return this.fallback(channel, content, 'not_configured');
      }
    }

    // 发布
    try {
      const result = await provider.publish(content, options);
      this.onEvent?.({
        name: result.success ? 'content_published' : 'content_publish_failed',
        properties: {
          channel,
          postId: result.postId,
          url: result.url,
          error: result.error,
        },
      });
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return this.fallback(channel, content, errMsg);
    }
  }

  /** 批量发布到多个渠道 */
  async publishAll(channels: PromotionChannel[], content: PromotContent, options?: PublishOptions): Promise<PublishResult[]> {
    const results = await Promise.allSettled(
      channels.map(ch => this.publish(ch, content, options)),
    );
    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        success: false,
        channel: channels[i],
        error: r.reason?.message ?? String(r.reason),
      };
    });
  }

  /** 降级策略：复制到剪贴板 + 打开目标页面 */
  private async fallback(channel: PromotionChannel, content: PromotContent, reason: string): Promise<PublishResult> {
    // 复制内容到剪贴板
    try {
      const text = `${content.title}\n\n${content.body}`;
      await navigator.clipboard.writeText(text);
    } catch {
      // 剪贴板可能不可用（非 HTTPS 环境），忽略
    }

    // 打开平台发布页面
    const pageUrl = this.getPublishPageUrl(channel, content);
    if (pageUrl) {
      try {
        window.open(pageUrl, '_blank');
      } catch {
        // window 可能不可用
      }
    }

    this.onEvent?.({
      name: 'content_publish_fallback',
      properties: { channel, reason, fallback: 'clipboard_and_open_page' },
    });

    return {
      success: false,
      channel,
      error: reason,
      fallback: 'clipboard',
    };
  }

  /** 获取平台的发布页面 URL */
  private getPublishPageUrl(channel: PromotionChannel, content?: PromotContent): string | null {
    const urls: Record<string, string> = {
      product_hunt: 'https://www.producthunt.com/posts/new',
      reddit: `https://www.reddit.com/submit`,
      hacker_news: 'https://news.ycombinator.com/submit',
      twitter: 'https://x.com/compose/post',
      linkedin: 'https://www.linkedin.com/post/new',
      discord: '', // 需要知道具体服务器
      indie_hackers: 'https://www.indiehackers.com/post/new',
      seo: '',
    };
    return urls[channel] || null;
  }

  /** 获取渠道认证配置 */
  private getChannelAuthConfig(channel: PromotionChannel): Record<string, unknown> | undefined {
    const configMap: Record<string, Record<string, unknown> | undefined> = {
      discord: this.channelConfig.discord as any,
      reddit: this.channelConfig.reddit as any,
      twitter: this.channelConfig.twitter as any,
      linkedin: this.channelConfig.linkedin as any,
      product_hunt: this.channelConfig.productHunt as any,
    };
    return configMap[channel];
  }
}
