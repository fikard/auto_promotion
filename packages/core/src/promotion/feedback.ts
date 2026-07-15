import type { PlatformAdapter, AnalyticsEvent } from '../adapter';
import type { PromotionChannel } from './types';

/** 推广反馈事件 */
export interface PromotionFeedback {
  channel: PromotionChannel;
  campaignId?: string;
  event: 'viewed' | 'clicked' | 'shared' | 'converted';
  timestamp: number;
  properties?: Record<string, unknown>;
}

/** 渠道效果统计 */
export interface ChannelPerformance {
  channel: PromotionChannel;
  views: number;
  clicks: number;
  shares: number;
  conversions: number;
  clickRate: number;
  conversionRate: number;
}

export class PromotionFeedbackTracker {
  private feedbacks: PromotionFeedback[] = [];
  private adapter: PlatformAdapter;
  private onEvent?: (event: AnalyticsEvent) => void;

  private static STORAGE_KEY = 'growth_sdk_promo_feedback';

  constructor(adapter: PlatformAdapter, onEvent?: (event: AnalyticsEvent) => void) {
    this.adapter = adapter;
    this.onEvent = onEvent;
  }

  /** 记录推广反馈 */
  async track(feedback: Omit<PromotionFeedback, 'timestamp'>): Promise<void> {
    const record: PromotionFeedback = {
      ...feedback,
      timestamp: Date.now(),
    };
    this.feedbacks.push(record);
    this.onEvent?.({
      name: `promotion_${feedback.event}`,
      properties: { channel: feedback.channel, campaignId: feedback.campaignId },
    });
    await this.save();
  }

  /** 获取各渠道效果统计 */
  getPerformance(): ChannelPerformance[] {
    const map = new Map<PromotionChannel, { views: number; clicks: number; shares: number; conversions: number }>();

    for (const fb of this.feedbacks) {
      let stats = map.get(fb.channel);
      if (!stats) {
        stats = { views: 0, clicks: 0, shares: 0, conversions: 0 };
        map.set(fb.channel, stats);
      }
      switch (fb.event) {
        case 'viewed': stats.views++; break;
        case 'clicked': stats.clicks++; break;
        case 'shared': stats.shares++; break;
        case 'converted': stats.conversions++; break;
      }
    }

    return Array.from(map.entries()).map(([channel, stats]) => ({
      channel,
      views: stats.views,
      clicks: stats.clicks,
      shares: stats.shares,
      conversions: stats.conversions,
      clickRate: stats.views > 0 ? stats.clicks / stats.views : 0,
      conversionRate: stats.clicks > 0 ? stats.conversions / stats.clicks : 0,
    }));
  }

  /** 获取推荐渠道排序（按转化率降序） */
  getRecommendedChannels(): ChannelPerformance[] {
    return this.getPerformance().sort((a, b) => b.conversionRate - a.conversionRate);
  }

  /** 持久化 */
  async save(): Promise<void> {
    await this.adapter.storage.set(PromotionFeedbackTracker.STORAGE_KEY, this.feedbacks);
  }

  /** 从 storage 加载 */
  async load(): Promise<void> {
    const data = await this.adapter.storage.get<PromotionFeedback[]>(
      PromotionFeedbackTracker.STORAGE_KEY,
    );
    if (data) {
      this.feedbacks = data;
    }
  }
}
