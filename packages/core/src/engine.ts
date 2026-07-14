import type { GrowthSDKConfig, AnalyticsEvent, PlatformAdapter, TriggerConfig } from './adapter';
import { TriggerEngine } from './triggers/trigger-engine';
import { TemplateEngine } from './templates/template-engine';
import { StrategyEngine } from './promotion/strategy-engine';
import { Tracker } from './analytics/tracker';
import { EmailTrigger } from './email/email-trigger';
import { createSecondSessionRating, createUsageCountRating } from './triggers/built-in/usage-count';
import { createInactiveReactivate } from './triggers/built-in/inactive';
import type { Trigger } from './triggers/types';
import type { UserEvent } from './triggers/types';
import type { RenderOptions, RenderedContent, GrowthTemplate, TemplateVariant } from './templates/types';
import type { PromotionChannel, PromotionTrigger, PromotionEvent, PromotionResult, PromotContent, PromotionStrategy, ProductInfo } from './promotion/types';

export class GrowthSDK {
  private config: GrowthSDKConfig;
  private adapter: PlatformAdapter;
  private _triggers: TriggerEngine;
  private _templates: TemplateEngine;
  private _promotion: StrategyEngine;
  private _analytics: Tracker;
  private _email: EmailTrigger;
  private initialized = false;

  constructor(config: GrowthSDKConfig) {
    this.config = config;
    this.adapter = config.adapter;

    const dispatchEvent = (event: AnalyticsEvent) => this._analytics.track(event.name, event.properties);

    this._analytics = new Tracker(config.analytics?.provider);
    this._triggers = new TriggerEngine(this.adapter, dispatchEvent);
    this._templates = new TemplateEngine(this.adapter, config.product);

    const productInfo: ProductInfo = {
      name: config.product.name,
      tagline: config.product.tagline,
      version: config.product.version,
      storeUrl: config.product.storeUrl,
      features: [],
      painPoint: '',
      coreBenefit: '',
      targetAudience: '',
      platform: this.adapter.device.getPlatform(),
    };
    this._promotion = new StrategyEngine(config.product, productInfo, dispatchEvent);

    this._email = new EmailTrigger(config.email ? {
      provider: config.email.provider,
      apiEndpoint: config.email.apiEndpoint,
      apiKey: config.email.apiKey,
      fromAddress: `${config.product.name.toLowerCase().replace(/\s+/g, '')}@notifications.app`,
    } : undefined, dispatchEvent);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await this._triggers.loadState();
    await this._templates.init();
    this.registerDefaultTriggers();

    this.initialized = true;

    this._analytics.track('sdk_initialized', {
      platform: this.adapter.device.getPlatform(),
      version: this.config.product.version,
      locale: this.adapter.device.getLocale(),
    });
  }

  get triggers() {
    return {
      register: (t: Trigger) => this._triggers.register(t),
      evaluate: (e: UserEvent) => this._triggers.evaluate(e),
      getHistory: () => this._triggers.getHistory(),
    };
  }

  get templates() {
    return {
      render: (id: string, opts: RenderOptions) => this._templates.render(id, opts),
      register: (t: GrowthTemplate) => this._templates.register(t),
      getVariant: (id: string) => this._templates.getVariant(id),
    };
  }

  get promotion() {
    return {
      generate: (ch: PromotionChannel, opts?: { locale?: string; [key: string]: unknown }) => this._promotion.generate(ch, opts),
      getRecommendedStrategies: () => this._promotion.getRecommendedStrategies(),
      registerTrigger: (t: PromotionTrigger) => this._promotion.registerTrigger(t),
      evaluate: (e: PromotionEvent) => this._promotion.evaluate(e),
    };
  }

  get analytics() {
    return {
      track: (n: string, p?: Record<string, unknown>) => this._analytics.track(n, p),
      identify: (id: string, t?: Record<string, unknown>) => this._analytics.identify(id, t),
    };
  }

  dispose(): void {
    this.initialized = false;
  }

  private registerDefaultTriggers(): void {
    const triggerConfig = this.config.triggers ?? {};

    if (triggerConfig['second_session_rating']?.enabled !== false) {
      this._triggers.register(createSecondSessionRating(triggerConfig['second_session_rating'] as any));
    }

    if (triggerConfig['usage_count_rating']?.enabled !== false) {
      this._triggers.register(createUsageCountRating(triggerConfig['usage_count_rating'] as any));
    }

    if (triggerConfig['inactive_reactivate']?.enabled !== false) {
      this._triggers.register(createInactiveReactivate(triggerConfig['inactive_reactivate'] as any));
    }
  }
}
