import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class RedditGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'reddit';

  generate(product: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent {
    const subreddit = (options?.subreddit as string) ?? 'r/productivity';
    if (locale === 'zh') {
      return {
        title: `我做了一个免费的浏览器插件可以${product.coreBenefit}——无需注册`,
        body: `我受够了那些需要注册、配置 API Key 才能试用的 AI 工具。所以我做了 ${product.name}——安装即用。\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\n有什么问题或功能建议欢迎留言！`,
        tags: [subreddit],
      };
    }
    return {
      title: `I made a free Chrome extension that ${product.coreBenefit} — no API key or signup needed`,
      body: `I got frustrated with AI tools that require you to sign up, enter an API key, or pay before you can even try them. So I built ${product.name} — install it, click, done.\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\nHappy to answer questions or take feature requests!`,
      tags: [subreddit],
    };
  }

  getRecommendedTiming(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0);
    return tomorrow;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    return audience.subreddits ?? ['r/productivity', 'r/SideProject'];
  }
}
