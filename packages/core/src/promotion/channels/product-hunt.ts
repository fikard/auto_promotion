import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class ProductHuntGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'product_hunt';

  generate(product: ProductInfo, locale: string): PromotContent {
    if (locale === 'zh') {
      return {
        title: `${product.name} — ${product.tagline}`,
        body: `受够了${product.painPoint}？${product.name} 让你${product.coreBenefit}——零配置。\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\n**适合：**${product.targetAudience}。\n\n安装即用，点击即得。`,
        cta: `在 Chrome Web Store 免费试用`,
        tags: ['效率', 'AI', '浏览器插件'],
      };
    }
    return {
      title: `${product.name} — ${product.tagline}`,
      body: `Tired of ${product.painPoint}? ${product.name} gives you ${product.coreBenefit} — with **zero configuration**.\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\n**Perfect for:** ${product.targetAudience}.\n\nJust install and click. That's it.`,
      cta: `Try it free on Chrome Web Store`,
      tags: ['productivity', 'ai', 'chrome-extension'],
    };
  }

  getRecommendedTiming(): Date {
    const now = new Date();
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
    const release = new Date(now);
    release.setDate(release.getDate() + daysUntilTuesday);
    release.setHours(0, 1, 0, 0);
    return release;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    const base = ['productivity', 'developer-tools', 'ai'];
    if (audience.segment === 'early_adopter') base.push('early-access');
    return base;
  }
}
