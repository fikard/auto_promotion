import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class SeoGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'seo';

  generate(productInfo: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent {
    return {
      title: `${productInfo.name} — ${productInfo.tagline}`,
      body: [
        `${productInfo.name} is ${productInfo.coreBenefit || productInfo.tagline}.`,
        ``,
        productInfo.features.length > 0 ? `Key features include: ${productInfo.features.join(', ')}.` : '',
        ``,
        `Solve ${productInfo.painPoint || 'your productivity challenges'} with ${productInfo.name}.`,
        ``,
        `Learn more: ${productInfo.storeUrl}`,
      ].filter(Boolean).join('\n'),
      cta: 'Learn More',
      tags: [productInfo.name.toLowerCase().replace(/\s+/g, '-'), 'tool', 'productivity'],
    };
  }

  getRecommendedTiming(strategy: TimingStrategy): Date {
    const date = new Date();
    date.setDate(date.getDate() + strategy.delayDays);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    const base = ['tool', 'productivity'];
    if (audience.locale === 'zh') base.push('效率工具', '在线工具');
    return base;
  }
}
