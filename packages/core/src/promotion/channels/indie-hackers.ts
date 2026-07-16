import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class IndieHackersGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'indie_hackers';

  generate(productInfo: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent {
    return {
      title: `${productInfo.name} — ${productInfo.tagline}`,
      body: [
        `Hey IH community! 👋`,
        ``,
        `I built **${productInfo.name}** to solve a problem I had: ${productInfo.painPoint || 'making workflows more efficient'}.`,
        ``,
        productInfo.features.length > 0 ? `**What it does:**\n${productInfo.features.map(f => `• ${f}`).join('\n')}` : '',
        ``,
        `It's ${productInfo.coreBenefit || productInfo.tagline}.`,
        ``,
        `Would love your feedback! 🔗 ${productInfo.storeUrl}`,
      ].filter(Boolean).join('\n'),
      cta: 'Share Feedback',
      tags: ['indie-hackers', 'build-in-public', 'launch'],
    };
  }

  getRecommendedTiming(strategy: TimingStrategy): Date {
    const date = new Date();
    date.setDate(date.getDate() + strategy.delayDays);
    date.setHours(9, 0, 0, 0);
    return date;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    const base = ['indie-hackers', 'build-in-public'];
    if (audience.segment === 'developer') base.push('saas', 'dev-tools');
    if (audience.segment === 'entrepreneur') base.push('startup', 'bootstrapped');
    return base;
  }
}
