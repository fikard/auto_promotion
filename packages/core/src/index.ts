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
  CompositeCondition,
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

// 实验统计
export type { VariantStats, ExperimentResult } from './templates/statistics';
export { ExperimentStats } from './templates/statistics';

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

// 归因追踪
export type { UTMParams, AttributionRecord } from './promotion/attribution';
export { AttributionTracker } from './promotion/attribution';

// 推广反馈
export type { PromotionFeedback, ChannelPerformance } from './promotion/feedback';
export { PromotionFeedbackTracker } from './promotion/feedback';

// 分析类型
export type { AnalyticsEvent as AnalyticsEventType } from './analytics/types';

// 隐私合规
export { ConsentManager } from './analytics/consent';
export type { ConsentState, ConsentManagerOptions } from './analytics/consent';

// 邮件类型
export type { EmailTemplate, EmailConfig } from './email/types';

// Feature Flag
export type { FeatureFlag, FlagType, FlagRule, FlagContext, FlagResult } from './feature-flags/types';
export { FlagEngine } from './feature-flags/flag-engine';

// 触发器工厂函数
export { createSecondSessionRating, createUsageCountRating } from './triggers/built-in/usage-count';
export { createInactiveReactivate } from './triggers/built-in/inactive';
