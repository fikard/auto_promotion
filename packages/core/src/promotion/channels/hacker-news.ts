import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class HackerNewsGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'hacker_news';

  generate(product: ProductInfo, locale: string): PromotContent {
    return {
      title: `Show HN: ${product.name} – ${product.coreBenefit} (${product.painPoint.replace(/\?/g, '')})`,
      body: `I built ${product.name} because I was tired of ${product.painPoint.toLowerCase()}.\n\nKey differentiators:\n${product.features.map(f => `- ${f}`).join('\n')}\n\nWould love feedback on the quality and UX.\n\n${product.storeUrl}`,
      tags: ['show-hn'],
    };
  }

  getRecommendedTiming(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0);
    return tomorrow;
  }

  getRecommendedTags(): string[] {
    return ['show-hn'];
  }
}
