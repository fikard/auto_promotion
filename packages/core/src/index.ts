// 主类
export { GrowthSDK } from './engine';

// 适配器与共享类型
export type {
  PlatformType,
  PlatformAdapter,
  RatingPromptConfig,
  RatingAction,
  NotificationConfig,
  ShareConfig,
  ProductConfig,
  GrowthSDKConfig,
  AnalyticsProvider,
  AnalyticsEvent,
  TriggerConfig,
} from './adapter';

// 触发器类型
export type {
  Trigger,
  TriggerCondition,
  TriggerAction,
  CooldownConfig,
  TriggerHistory,
  UserEvent,
} from './triggers/types';

// 模板类型
export type {
  GrowthTemplate,
  LocaleContent,
  TemplateVariable,
  TemplateVariant,
  RenderOptions,
  RenderedContent,
  PromotionChannel,
} from './templates/types';

// 推广类型
export type {
  PromotionStrategy,
  PromotionTrigger,
  PromotionEvent,
  PromotionResult,
  PromotContent,
  ProductInfo,
  TimingStrategy,
  AudienceProfile,
} from './promotion/types';

// 分析类型
export type { AnalyticsEvent as AnalyticsEventType } from './analytics/types';

// 邮件类型
export type { EmailTemplate, EmailConfig } from './email/types';

// 触发器工厂函数
export { createSecondSessionRating, createUsageCountRating } from './triggers/built-in/usage-count';
export { createInactiveReactivate } from './triggers/built-in/inactive';
