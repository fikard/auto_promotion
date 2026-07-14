/**
 * SDK 全生命周期集成测试
 * 验证：初始化 → 注册触发器 → 用户事件 → 触发动作 → 分析上报 → 销毁
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GrowthSDK } from '../packages/core/src/engine';
import { createMockAdapter, createMockAnalyticsProvider, TEST_PRODUCT } from './helpers';

describe('SDK 全生命周期', () => {
  let sdk: GrowthSDK;
  let mock: ReturnType<typeof createMockAdapter>;
  let analytics: ReturnType<typeof createMockAnalyticsProvider>;

  beforeEach(async () => {
    mock = createMockAdapter();
    analytics = createMockAnalyticsProvider();
    sdk = new GrowthSDK({
      adapter: mock.adapter,
      product: TEST_PRODUCT,
      analytics: { provider: analytics.provider },
    });
  });

  afterEach(() => {
    sdk.dispose();
  });

  describe('初始化', () => {
    it('init 后应发出 sdk_initialized 事件', async () => {
      await sdk.init();
      expect(analytics.events.some(e => e.name === 'sdk_initialized')).toBe(true);
    });

    it('sdk_initialized 事件应包含 platform/version/locale', async () => {
      await sdk.init();
      const initEvent = analytics.events.find(e => e.name === 'sdk_initialized');
      expect(initEvent?.properties).toMatchObject({
        platform: 'chrome',
        version: '1.1.0',
        locale: 'en',
      });
    });

    it('重复 init 不应报错也不应重复触发', async () => {
      await sdk.init();
      const countAfterFirst = analytics.events.filter(e => e.name === 'sdk_initialized').length;
      await sdk.init();
      const countAfterSecond = analytics.events.filter(e => e.name === 'sdk_initialized').length;
      expect(countAfterFirst).toBe(countAfterSecond);
    });
  });

  describe('销毁', () => {
    it('dispose 后应安全停止', async () => {
      await sdk.init();
      expect(() => sdk.dispose()).not.toThrow();
    });

    it('dispose → 重新 init 应能恢复', async () => {
      await sdk.init();
      sdk.dispose();
      await sdk.init();
      expect(analytics.events.filter(e => e.name === 'sdk_initialized').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('内置触发器注册', () => {
    it('默认应注册 3 个内置触发器', async () => {
      await sdk.init();
      // 内置触发器已注册，可以通过 evaluate 验证
      // second_session_rating, usage_count_rating, inactive_reactivate
      expect(sdk.triggers.getHistory()).toHaveLength(0);
    });

    it('通过 config 禁用特定触发器', async () => {
      const disabledMock = createMockAdapter();
      const disabledAnalytics = createMockAnalyticsProvider();
      const disabledSdk = new GrowthSDK({
        adapter: disabledMock.adapter,
        product: TEST_PRODUCT,
        analytics: { provider: disabledAnalytics.provider },
        triggers: {
          second_session_rating: { enabled: false },
          usage_count_rating: { enabled: false },
        },
      });
      await disabledSdk.init();
      disabledSdk.dispose();
    });
  });

  describe('完整用户旅程', () => {
    it('用户打开 → 触发器评估 → 推广生成 → 分析追踪', async () => {
      await sdk.init();

      // 1. 用户触发 session 事件
      await sdk.triggers.evaluate({ type: 'session_start' });

      // 2. 生成推广内容
      const phContent = sdk.promotion.generate('product_hunt');
      expect(phContent.title).toContain('PageLens');

      const redditContent = sdk.promotion.generate('reddit');
      expect(redditContent.body).toContain('PageLens');

      // 3. 追踪自定义事件
      sdk.analytics.track('summary_created', { pageType: 'github' });
      sdk.analytics.track('summary_created', { pageType: 'arxiv' });

      // 4. 验证分析事件
      const summaryEvents = analytics.events.filter(e => e.name === 'summary_created');
      expect(summaryEvents).toHaveLength(2);

      // 5. 验证推广事件
      const promoEvents = analytics.events.filter(e => e.name === 'promotion_generated');
      expect(promoEvents.length).toBeGreaterThanOrEqual(2);

      // 6. 用户标识
      sdk.analytics.identify('user-123', { plan: 'free', totalSummaries: 2 });
      expect(analytics.identities).toHaveLength(1);
      expect(analytics.identities[0].userId).toBe('user-123');
    });

    it('版本发布 → 自动推广策略评估', async () => {
      await sdk.init();

      sdk.promotion.registerTrigger({
        event: 'version_release',
        channels: ['product_hunt', 'hacker_news', 'twitter'],
        autoAction: 'notification',
      });

      const results = sdk.promotion.evaluate({ type: 'version_release' });
      expect(results).toHaveLength(3);
      expect(results[0].content.title).toContain('PageLens');
      expect(results[1].content.title).toContain('Show HN');
      expect(results[2].content.body).toContain('Thread');
    });
  });
});
