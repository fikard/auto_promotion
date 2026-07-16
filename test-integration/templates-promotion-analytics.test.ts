/**
 * 模板 + 推广 + 分析 联合集成测试
 * 验证：模板渲染 → A/B 分配 → 推广内容生成 → 多语言支持 → 事件追踪
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GrowthSDK } from '../packages/core/src/engine';
import { createMockAdapter, createMockAnalyticsProvider, TEST_PRODUCT } from './helpers';

describe('模板 + 推广 + 分析联合', () => {
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
    await sdk.init();
  });

  describe('模板渲染全流程', () => {
    it('应注册 → 渲染 → 变量替换 → 多语言', () => {
      sdk.templates.register({
        id: 'rating_prompt',
        type: 'trigger',
        name: 'Rating Prompt Template',
        locales: {
          en: {
            title: 'Enjoying {productName}?',
            body: 'A review helps others discover {productName}. It only takes 30 seconds!',
            cta: 'Rate now',
          },
          zh: {
            title: '喜欢 {productName} 吗？',
            body: '您的评价能帮助更多人发现 {productName}。只需 30 秒！',
            cta: '立即评价',
          },
          ja: {
            title: '{productName} を楽しんでいますか？',
            body: 'レビューは他の人の発見に役立ちます。30秒だけ！',
            cta: '今すぐ評価',
          },
        },
        variables: [
          { name: 'productName', type: 'string', required: true, source: 'product' },
        ],
        platforms: ['chrome'],
      });

      // 英文
      const en = sdk.templates.render('rating_prompt', {
        locale: 'en',
        variables: { productName: 'PageLens' },
      });
      expect(en.title).toBe('Enjoying PageLens?');
      expect(en.cta).toBe('Rate now');

      // 中文
      const zh = sdk.templates.render('rating_prompt', {
        locale: 'zh',
        variables: { productName: 'PageLens' },
      });
      expect(zh.title).toBe('喜欢 PageLens 吗？');
      expect(zh.cta).toBe('立即评价');

      // 日文
      const ja = sdk.templates.render('rating_prompt', {
        locale: 'ja',
        variables: { productName: 'PageLens' },
      });
      expect(ja.title).toBe('PageLens を楽しんでいますか？');
    });

    it('未支持的语言应回退到 en', () => {
      sdk.templates.register({
        id: 'fallback_test',
        type: 'trigger',
        name: 'Fallback Test',
        locales: {
          en: { body: 'English content for {name}' },
          zh: { body: '中文内容 {name}' },
        },
        variables: [
          { name: 'name', type: 'string', required: true, source: 'custom' },
        ],
        platforms: ['chrome'],
      });

      const result = sdk.templates.render('fallback_test', {
        locale: 'fr',
        variables: { name: 'Alice' },
      });
      expect(result.locale).toBe('en');
      expect(result.body).toBe('English content for Alice');
    });

    it('变量 defaultValue 应在未提供时生效', () => {
      sdk.templates.register({
        id: 'default_var_test',
        type: 'trigger',
        name: 'Default Var Test',
        locales: {
          en: { body: 'Hello {name}! {greeting}' },
        },
        variables: [
          { name: 'name', type: 'string', required: true, source: 'custom' },
          { name: 'greeting', type: 'string', required: false, source: 'custom', defaultValue: 'Welcome!' },
        ],
        platforms: ['chrome'],
      });

      const result = sdk.templates.render('default_var_test', {
        variables: { name: 'Bob' },
      });
      expect(result.body).toBe('Hello Bob! Welcome!');
    });
  });

  describe('A/B 测试', () => {
    it('应按权重分配变体并持久化', async () => {
      sdk.templates.register({
        id: 'ab_test_template',
        type: 'promotion',
        name: 'A/B Test Template',
        locales: {
          en: { body: 'Default: {productName}' },
        },
        variables: [
          { name: 'productName', type: 'string', required: true, source: 'product' },
        ],
        variants: [
          { id: 'pain_first', name: '痛点先行', weight: 50, content: { body: 'Pain: {productName}' } },
          { id: 'feature_first', name: '功能先行', weight: 50, content: { body: 'Feature: {productName}' } },
        ],
        platforms: ['chrome'],
      });

      const variant = await sdk.templates.getVariant('ab_test_template');
      expect(variant).not.toBeNull();
      expect(['pain_first', 'feature_first']).toContain(variant!.id);

      // 使用变体渲染
      const result = sdk.templates.render('ab_test_template', {
        variables: { productName: 'PageLens' },
        variantId: variant!.id,
      });
      expect(result.variantId).toBe(variant!.id);
      if (variant!.id === 'pain_first') {
        expect(result.body).toBe('Pain: PageLens');
      } else {
        expect(result.body).toBe('Feature: PageLens');
      }
    });

    it('同一用户应始终获得同一变体', async () => {
      sdk.templates.register({
        id: 'consistent_ab',
        type: 'promotion',
        name: 'Consistent A/B',
        locales: { en: { body: 'base' } },
        variables: [],
        variants: [
          { id: 'a', name: 'A', weight: 50, content: { body: 'A' } },
          { id: 'b', name: 'B', weight: 50, content: { body: 'B' } },
        ],
        platforms: ['chrome'],
      });

      const first = await sdk.templates.getVariant('consistent_ab');
      const second = await sdk.templates.getVariant('consistent_ab');
      const third = await sdk.templates.getVariant('consistent_ab');
      expect(first!.id).toBe(second!.id);
      expect(second!.id).toBe(third!.id);
    });
  });

  describe('推广内容生成', () => {
    it('Product Hunt — 应生成完整的发布稿', () => {
      const content = sdk.promotion.generate('product_hunt');
      expect(content.title).toContain('PageLens');
      expect(content.body).toBeTruthy();
      expect(content.tags.length).toBeGreaterThan(0);
      expect(content.cta).toBeTruthy();
    });

    it('Reddit — 应生成符合社区风格的帖子', () => {
      const content = sdk.promotion.generate('reddit', { subreddit: 'r/productivity' });
      expect(content.title).toBeTruthy();
      expect(content.body).toBeTruthy();
      expect(content.tags).toContain('r/productivity');
    });

    it('Hacker News — 应以 Show HN 开头', () => {
      const content = sdk.promotion.generate('hacker_news');
      expect(content.title).toContain('Show HN');
      expect(content.tags).toContain('show-hn');
    });

    it('Twitter — 应生成 Thread 格式', () => {
      const content = sdk.promotion.generate('twitter');
      expect(content.body).toContain('Thread');
      expect(content.body).toContain('#BuildInPublic');
    });

    it('应追踪 promotion_generated 事件', () => {
      sdk.promotion.generate('product_hunt');
      sdk.promotion.generate('reddit');

      const promoEvents = analytics.events.filter(e => e.name === 'promotion_generated');
      expect(promoEvents).toHaveLength(2);
      expect(promoEvents[0].properties).toMatchObject({ channel: 'product_hunt' });
      expect(promoEvents[1].properties).toMatchObject({ channel: 'reddit' });
    });

    it('未注册的渠道应抛出错误', () => {
      expect(() => sdk.promotion.generate('nonexistent_channel' as any)).toThrow();
    });
  });

  describe('自动化推广触发', () => {
    it('版本发布应自动生成多渠道推广内容', () => {
      sdk.promotion.registerTrigger({
        event: 'version_release',
        channels: ['product_hunt', 'reddit', 'hacker_news'],
        autoAction: 'notification',
      });

      const results = sdk.promotion.evaluate({ type: 'version_release' });
      expect(results).toHaveLength(3);

      const channels = results.map(r => r.channel);
      expect(channels).toContain('product_hunt');
      expect(channels).toContain('reddit');
      expect(channels).toContain('hacker_news');

      for (const result of results) {
        expect(result.content.title || result.content.body).toBeTruthy();
        expect(result.recommendedTime).toBeInstanceOf(Date);
      }
    });

    it('未注册的事件应返回空数组', () => {
      const results = sdk.promotion.evaluate({ type: 'growth_stagnation' });
      expect(results).toHaveLength(0);
    });
  });

  describe('推荐策略', () => {
    it('应返回基于平台的推荐策略', () => {
      const strategies = sdk.promotion.getRecommendedStrategies();
      expect(strategies.length).toBeGreaterThan(0);

      for (const strategy of strategies) {
        expect(strategy.platform).toBe('chrome');
        expect(strategy.channel).toBeTruthy();
        expect(strategy.timingStrategy).toBeTruthy();
        expect(strategy.targetAudience).toBeTruthy();
      }
    });
  });
});
