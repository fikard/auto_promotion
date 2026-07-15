import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class DiscordGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'discord';

  generate(productInfo: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent {
    return {
      title: `🚀 ${productInfo.name} — ${productInfo.tagline}`,
      body: [
        `Hey everyone! 👋`,
        ``,
        `I just launched **${productInfo.name}** — ${productInfo.coreBenefit || productInfo.tagline}.`,
        ``,
        productInfo.features.length > 0 ? `**Key Features:**\n${productInfo.features.map(f => `• ${f}`).join('\n')}` : '',
        ``,
        `Problem it solves: ${productInfo.painPoint || 'Making your workflow smoother'}`,
        ``,
        `🔗 Check it out: ${productInfo.storeUrl}`,
        ``,
        `Would love your feedback! 💬`,
      ].filter(Boolean).join('\n'),
      cta: 'Join Discussion',
      tags: ['launch', 'productivity', 'tools', 'indie-hackers'],
    };
  }

  getRecommendedTiming(strategy: TimingStrategy): Date {
    const date = new Date();
    date.setDate(date.getDate() + strategy.delayDays);
    date.setHours(10, 0, 0, 0); // 10 AM UTC
    return date;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    const base = ['launch', 'productivity'];
    if (audience.segment === 'developer') base.push('dev-tools', 'open-source');
    if (audience.segment === 'entrepreneur') base.push('saas', 'startup');
    return base;
  }
}
