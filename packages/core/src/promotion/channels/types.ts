import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export interface ChannelGenerator {
  channel: PromotionChannel;
  generate(productInfo: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent;
  getRecommendedTiming(strategy: TimingStrategy): Date;
  getRecommendedTags(audience: AudienceProfile): string[];
}
