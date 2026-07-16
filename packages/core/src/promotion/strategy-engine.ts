import type { ProductConfig, PlatformType, AnalyticsEvent, PlatformAdapter } from '../adapter';
import type { PromotionChannel, PromotionStrategy, PromotionTrigger, PromotionEvent, PromotionResult, PromotContent, ProductInfo } from './types';
import type { ChannelGenerator } from './channels/types';
import { ProductHuntGenerator } from './channels/product-hunt';
import { RedditGenerator } from './channels/reddit';
import { HackerNewsGenerator } from './channels/hacker-news';
import { TwitterGenerator } from './channels/twitter';
import { DiscordGenerator } from './channels/discord';
import { LinkedInGenerator } from './channels/linkedin';
import { IndieHackersGenerator } from './channels/indie-hackers';
import { SeoGenerator } from './channels/seo';
import { AttributionTracker } from './attribution';
import { PromotionFeedbackTracker } from './feedback';
import type { PromotionFeedback, ChannelPerformance } from './feedback';

/** 内存存储适配器，用于无 PlatformAdapter 时的兜底 */
const memoryStore = new Map<string, unknown>();
const memoryAdapter: PlatformAdapter = {
  storage: {
    get: async <T>(key: string): Promise<T | null> => (memoryStore.get(key) as T) ?? null,
    set: async (key: string, value: unknown) => { memoryStore.set(key, value); },
    remove: async (key: string) => { memoryStore.delete(key); },
  },
  ui: { showRatingPrompt: async () => ({ type: 'dismiss' }), showNotification: async () => {}, showShareDialog: async () => {} },
  links: { openStorePage: () => {}, openShareUrl: () => {}, getStoreUrl: () => '' },
  device: { getPlatform: () => 'chrome' as PlatformType, getVersion: () => '0.0.0', getLocale: () => 'en' },
};

export class StrategyEngine {
  private generators: Map<PromotionChannel, ChannelGenerator> = new Map();
  private triggers: Map<string, PromotionTrigger> = new Map();
  private productInfo: ProductInfo;
  private onEvent?: (event: AnalyticsEvent) => void;
  private attributionTracker: AttributionTracker;
  private feedbackTracker: PromotionFeedbackTracker;
  private adapter: PlatformAdapter;

  constructor(productConfig: ProductConfig, productInfo: ProductInfo, onEvent?: (event: AnalyticsEvent) => void, adapter?: PlatformAdapter) {
    this.productInfo = productInfo;
    this.onEvent = onEvent;
    this.adapter = adapter ?? memoryAdapter;

    this.attributionTracker = new AttributionTracker(this.adapter, onEvent);
    this.feedbackTracker = new PromotionFeedbackTracker(this.adapter, onEvent);

    this.registerGenerator(new ProductHuntGenerator());
    this.registerGenerator(new RedditGenerator());
    this.registerGenerator(new HackerNewsGenerator());
    this.registerGenerator(new TwitterGenerator());
    this.registerGenerator(new DiscordGenerator());
    this.registerGenerator(new LinkedInGenerator());
    this.registerGenerator(new IndieHackersGenerator());
    this.registerGenerator(new SeoGenerator());
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

    // 为推广内容自动附加 UTM 参数到 storeUrl
    const utm = AttributionTracker.channelUTM(channel);
    const url = AttributionTracker.buildUTMUrl(this.productInfo.storeUrl, utm);
    content.url = url;

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

  /** 推广反馈追踪 API */
  get promotionFeedback() {
    return {
      track: (f: Omit<PromotionFeedback, 'timestamp'>) => this.feedbackTracker.track(f),
      getPerformance: () => this.feedbackTracker.getPerformance(),
      getRecommendedChannels: () => this.feedbackTracker.getRecommendedChannels(),
    };
  }

  getRecommendedStrategies(): PromotionStrategy[] {
    const platform = this.productInfo.platform;
    const strategies: PromotionStrategy[] = [];

    const channelMapping: Record<string, PromotionChannel[]> = {
      chrome: ['product_hunt', 'reddit', 'hacker_news', 'twitter', 'discord', 'linkedin'],
      vscode: ['hacker_news', 'reddit', 'twitter', 'discord'],
      shopify: ['reddit', 'twitter', 'linkedin'],
    };

    const channels = channelMapping[platform] ?? ['product_hunt', 'reddit', 'twitter'];

    // 获取反馈数据中的渠道转化率，用于调整排序权重
    const performanceMap = new Map<PromotionChannel, number>();
    for (const perf of this.feedbackTracker.getPerformance()) {
      performanceMap.set(perf.channel, perf.conversionRate);
    }

    // 按历史转化率降序排列渠道
    const sortedChannels = [...channels].sort((a, b) => {
      const rateA = performanceMap.get(a) ?? 0;
      const rateB = performanceMap.get(b) ?? 0;
      return rateB - rateA;
    });

    for (const channel of sortedChannels) {
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
