import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class LinkedInGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'linkedin';

  generate(productInfo: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent {
    return {
      title: `Introducing ${productInfo.name}`,
      body: [
        `I'm excited to share ${productInfo.name} with the community.`,
        ``,
        `${productInfo.coreBenefit || productInfo.tagline}.`,
        ``,
        productInfo.features.length > 0 ? `Here's what makes it different:\n${productInfo.features.map(f => `→ ${f}`).join('\n')}` : '',
        ``,
        `If you've ever struggled with ${productInfo.painPoint || 'this problem'}, I'd love to hear your thoughts.`,
        ``,
        `Try it free: ${productInfo.storeUrl}`,
        ``,
        `#${productInfo.name.replace(/\s+/g, '')} #ProductLaunch #Innovation`,
      ].filter(Boolean).join('\n'),
      cta: 'Learn More',
      tags: ['product-launch', 'innovation', 'productivity'],
    };
  }

  getRecommendedTiming(strategy: TimingStrategy): Date {
    const date = new Date();
    date.setDate(date.getDate() + strategy.delayDays);
    // LinkedIn 最佳发布时间：周二/周三/周四 8-10 AM
    date.setDate(date.getDate() + ((2 - date.getDay() + 7) % 7)); // 下一个周二
    date.setHours(9, 0, 0, 0);
    return date;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    const base = ['product-launch', 'innovation'];
    if (audience.segment === 'professional') base.push('career', 'productivity');
    if (audience.segment === 'entrepreneur') base.push('startup', 'saas');
    return base;
  }
}
