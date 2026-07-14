import type { ProductConfig, PlatformType, AnalyticsEvent } from '../adapter';
import type { PromotionChannel, PromotionStrategy, PromotionTrigger, PromotionEvent, PromotionResult, PromotContent, ProductInfo } from './types';
import type { ChannelGenerator } from './channels/types';
import { ProductHuntGenerator } from './channels/product-hunt';
import { RedditGenerator } from './channels/reddit';
import { HackerNewsGenerator } from './channels/hacker-news';
import { TwitterGenerator } from './channels/twitter';

export class StrategyEngine {
  private generators: Map<PromotionChannel, ChannelGenerator> = new Map();
  private triggers: Map<string, PromotionTrigger> = new Map();
  private productInfo: ProductInfo;
  private onEvent?: (event: AnalyticsEvent) => void;

  constructor(productConfig: ProductConfig, productInfo: ProductInfo, onEvent?: (event: AnalyticsEvent) => void) {
    this.productInfo = productInfo;
    this.onEvent = onEvent;

    this.registerGenerator(new ProductHuntGenerator());
    this.registerGenerator(new RedditGenerator());
    this.registerGenerator(new HackerNewsGenerator());
    this.registerGenerator(new TwitterGenerator());
  }

  registerGenerator(generator: ChannelGenerator): void {
    this.generators.set(generator.channel, generator);
  }

  registerTrigger(trigger: PromotionTrigger): void {
    this.triggers.set(trigger.event, trigger);
  }

  generate(channel: PromotionChannel, options: { locale?: string; [key: string]: unknown } = {}): PromotContent {
    const generator = this.generators.get(channel);
    if (!generator) throw new Error(`No generator registered for channel: ${channel}`);
    const locale = options.locale ?? 'en';
    const content = generator.generate(this.productInfo, locale, options);

    this.onEvent?.({
      name: 'promotion_generated',
      properties: { channel, locale },
    });

    return content;
  }

  evaluate(event: PromotionEvent): PromotionResult[] {
    const trigger = this.triggers.get(event.type);
    if (!trigger) return [];

    return trigger.channels.map(channel => {
      const content = this.generate(channel, { locale: 'en' });
      const generator = this.generators.get(channel);
      const recommendedTime = generator?.getRecommendedTiming({ trigger: 'version_release' as const, delayDays: 0 });

      return { channel, content, recommendedTime };
    });
  }

  getRecommendedStrategies(): PromotionStrategy[] {
    const platform = this.productInfo.platform;
    const strategies: PromotionStrategy[] = [];

    const channelMapping: Record<string, PromotionChannel[]> = {
      chrome: ['product_hunt', 'reddit', 'hacker_news', 'twitter'],
      vscode: ['hacker_news', 'reddit', 'twitter'],
      shopify: ['reddit', 'twitter'],
    };

    const channels = channelMapping[platform] ?? ['product_hunt', 'reddit', 'twitter'];
    for (const channel of channels) {
      strategies.push({
        platform,
        channel,
        contentTemplate: `${channel}-${platform}`,
        timingStrategy: { trigger: 'version_release', delayDays: 0 },
        targetAudience: { locale: 'en', segment: 'early_adopter' },
      });
    }

    return strategies;
  }
}
