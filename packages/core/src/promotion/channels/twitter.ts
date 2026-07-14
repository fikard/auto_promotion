import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class TwitterGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'twitter';

  generate(product: ProductInfo, locale: string): PromotContent {
    return {
      title: '',
      body: [
        `🧵 Thread: I built ${product.name} — ${product.tagline}`,
        ``,
        `The problem: ${product.painPoint}`,
        `The solution: ${product.coreBenefit}`,
        ``,
        `What makes it different:`,
        ...product.features.slice(0, 4).map(f => `→ ${f}`),
        ``,
        `Try it free: ${product.storeUrl}`,
        ``,
        `#BuildInPublic #IndieHacker #AI`,
      ].join('\n'),
      tags: ['BuildInPublic', 'IndieHacker', 'AI', 'Productivity'],
    };
  }

  getRecommendedTiming(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }

  getRecommendedTags(): string[] {
    return ['BuildInPublic', 'IndieHacker', 'AI'];
  }
}
