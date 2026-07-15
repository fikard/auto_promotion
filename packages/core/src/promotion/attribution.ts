import type { PlatformAdapter, AnalyticsEvent } from '../adapter';
import type { PromotionChannel } from './types';

/** UTM 参数 */
export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

/** 归因记录 */
export interface AttributionRecord {
  id: string;
  utm: UTMParams;
  channel: PromotionChannel;
  firstTouchAt: number;
  lastTouchAt: number;
  conversions: number;
}

export class AttributionTracker {
  private records: Map<string, AttributionRecord> = new Map();
  private adapter: PlatformAdapter;
  private onEvent?: (event: AnalyticsEvent) => void;

  private static STORAGE_KEY = 'growth_sdk_attribution';

  constructor(adapter: PlatformAdapter, onEvent?: (event: AnalyticsEvent) => void) {
    this.adapter = adapter;
    this.onEvent = onEvent;
  }

  /** 从 URL 中解析 UTM 参数 */
  static parseUTM(url: string): UTMParams {
    try {
      const parsed = new URL(url);
      const utm: UTMParams = {};
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
      for (const key of keys) {
        const value = parsed.searchParams.get(key);
        if (value) {
          (utm as Record<string, string>)[key] = value;
        }
      }
      return utm;
    } catch {
      return {};
    }
  }

  /** 生成带 UTM 参数的推广 URL */
  static buildUTMUrl(baseUrl: string, utm: UTMParams): string {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(utm)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  /** 为推广渠道自动生成标准 UTM 参数 */
  static channelUTM(channel: PromotionChannel, campaign?: string): UTMParams {
    const mapping: Record<PromotionChannel, { utm_source: string; utm_medium: string }> = {
      product_hunt: { utm_source: 'producthunt', utm_medium: 'launch' },
      reddit: { utm_source: 'reddit', utm_medium: 'social' },
      hacker_news: { utm_source: 'hackernews', utm_medium: 'social' },
      twitter: { utm_source: 'twitter', utm_medium: 'social' },
      indie_hackers: { utm_source: 'indiehackers', utm_medium: 'social' },
      seo: { utm_source: 'organic', utm_medium: 'seo' },
      discord: { utm_source: 'discord', utm_medium: 'community' },
      linkedin: { utm_source: 'linkedin', utm_medium: 'social' },
    };
    const base = mapping[channel];
    const result: UTMParams = { ...base };
    if (campaign) {
      result.utm_campaign = campaign;
    }
    return result;
  }

  /** 记录归因触点 */
  async trackTouch(utm: UTMParams, channel: PromotionChannel): Promise<void> {
    const source = utm.utm_source ?? channel;
    const existing = this.records.get(source);

    if (existing) {
      existing.lastTouchAt = Date.now();
    } else {
      this.records.set(source, {
        id: source,
        utm,
        channel,
        firstTouchAt: Date.now(),
        lastTouchAt: Date.now(),
        conversions: 0,
      });
    }

    this.onEvent?.({
      name: 'attribution_touch',
      properties: { source, channel },
    });

    await this.save();
  }

  /** 记录转化事件，关联到最近的归因 */
  async trackConversion(event: string, properties?: Record<string, unknown>): Promise<void> {
    // 找到最近触点的归因记录
    let latest: AttributionRecord | undefined;
    for (const record of this.records.values()) {
      if (!latest || record.lastTouchAt > latest.lastTouchAt) {
        latest = record;
      }
    }

    if (latest) {
      latest.conversions++;
    }

    this.onEvent?.({
      name: 'attribution_conversion',
      properties: { event, source: latest?.id, ...properties },
    });

    await this.save();
  }

  /** 获取所有归因记录 */
  getRecords(): AttributionRecord[] {
    return Array.from(this.records.values());
  }

  /** 持久化到 storage */
  async save(): Promise<void> {
    const data = Array.from(this.records.entries());
    await this.adapter.storage.set(AttributionTracker.STORAGE_KEY, data);
  }

  /** 从 storage 加载 */
  async load(): Promise<void> {
    const data = await this.adapter.storage.get<[string, AttributionRecord][]>(
      AttributionTracker.STORAGE_KEY,
    );
    if (data) {
      this.records = new Map(data);
    }
  }
}
