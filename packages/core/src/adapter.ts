/** 支持的平台类型 */
export type PlatformType = 'chrome' | 'vscode' | 'shopify' | 'figma' | 'wordpress' | 'notion' | 'web';

/** 评分弹窗配置 */
export interface RatingPromptConfig {
  title: string;
  message: string;
  options: Array<{
    emoji: string;
    label: string;
    action: 'open_store' | 'show_feedback' | 'dismiss';
  }>;
  storeUrl: string;
  feedbackUrl?: string;
  delayMs?: number;
}

/** 评分动作结果 */
export type RatingAction = { type: 'open_store' | 'show_feedback' | 'dismiss' };

/** 通知配置 */
export interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'celebration';
  cta?: { label: string; url: string };
  duration?: number;
}

/** 分享配置 */
export interface ShareConfig {
  title: string;
  text: string;
  url: string;
  channels?: string[];
}

/** 平台适配器接口 — SDK 与平台交互的核心契约 */
export interface PlatformAdapter {
  /** 持久化存储 */
  storage: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
  };
  /** UI 展示 */
  ui: {
    showRatingPrompt(config: RatingPromptConfig): Promise<RatingAction>;
    showNotification(config: NotificationConfig): Promise<void>;
    showShareDialog(config: ShareConfig): Promise<void>;
  };
  /** 链接跳转 */
  links: {
    openStorePage(): void;
    openShareUrl(url: string): void;
    getStoreUrl(): string;
  };
  /** 设备/环境信息 */
  device: {
    getPlatform(): PlatformType;
    getVersion(): string;
    getLocale(): string;
  };
}

/** 产品配置 */
export interface ProductConfig {
  name: string;
  tagline: string;
  version: string;
  storeUrl: string;
  supportUrl?: string;
  locale: string;
}

/** 分析提供商接口 */
export interface AnalyticsProvider {
  name: string;
  init(config: Record<string, unknown>): void;
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
}

/** 分析事件 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}

/** 触发器配置（用于初始化时覆盖默认值） */
export interface TriggerConfig {
  enabled: boolean;
  [key: string]: unknown;
}

/** SDK 初始化配置 */
export interface GrowthSDKConfig {
  adapter: PlatformAdapter;
  product: ProductConfig;
  analytics?: {
    provider: AnalyticsProvider;
  };
  email?: {
    provider: 'resend' | 'sendgrid';
    apiEndpoint: string;
    apiKey: string;
  };
  triggers?: Record<string, TriggerConfig>;
  featureFlags?: {
    remoteConfigUrl?: string;
    context?: import('./feature-flags/types').FlagContext;
  };
  privacy?: {
    defaultConsent?: 'granted' | 'denied' | 'unknown';
    anonymousMode?: boolean;
    sensitiveFields?: string[];
  };
  publish?: {
    channels?: import('./publish/types').PublishChannelConfig;
  };
}
