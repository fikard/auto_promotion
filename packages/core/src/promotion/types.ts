import type { PlatformType } from '../adapter';

export type PromotionChannel = 'product_hunt' | 'reddit' | 'hacker_news' | 'twitter' | 'indie_hackers' | 'seo' | 'discord' | 'linkedin';

export interface TimingStrategy {
  trigger: 'version_release' | 'milestone' | 'manual';
  delayDays: number;
  milestone?: string;
}

export interface AudienceProfile {
  locale: string;
  segment: string;
  subreddits?: string[];
}

export interface PromotionStrategy {
  platform: PlatformType;
  channel: PromotionChannel;
  contentTemplate: string;
  timingStrategy: TimingStrategy;
  targetAudience: AudienceProfile;
}

export interface PromotionTrigger {
  event: 'version_release' | 'milestone' | 'growth_stagnation' | 'first_rating' | 'feature_release';
  channels: PromotionChannel[];
  autoAction?: 'clipboard' | 'open_page' | 'notification';
}

export interface PromotionEvent {
  type: PromotionTrigger['event'];
  properties?: Record<string, unknown>;
}

export interface PromotionResult {
  channel: PromotionChannel;
  content: PromotContent;
  recommendedTime?: Date;
}

export interface PromotContent {
  title: string;
  body: string;
  cta?: string;
  tags: string[];
  recommendedTime?: Date;
  url?: string;
}

export interface ProductInfo {
  name: string;
  tagline: string;
  version: string;
  storeUrl: string;
  features: string[];
  painPoint: string;
  coreBenefit: string;
  targetAudience: string;
  platform: PlatformType;
}
