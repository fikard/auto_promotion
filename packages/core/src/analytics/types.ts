/** 分析事件 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}

/** 分析提供商接口 */
export interface AnalyticsProvider {
  name: string;
  init(config: Record<string, unknown>): void;
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
}

/** 内置漏斗定义 */
export const BUILTIN_FUNNELS: Record<string, string[]> = {
  onboarding: ['sdk_initialized', 'first_action', 'second_session'],
  engagement: ['trigger_shown', 'trigger_accepted', 'rating_opened', 'share_completed'],
  reactivation: ['email_triggered', 'app_reopened', 'action_taken'],
  conversion: ['pricing_viewed', 'payment_initiated', 'payment_completed'],
};
