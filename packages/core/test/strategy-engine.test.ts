import { describe, it, expect, vi } from 'vitest';
import { StrategyEngine } from '../src/promotion/strategy-engine';
import type { ProductInfo } from '../src/promotion/types';
import type { ProductConfig } from '../src/adapter';

const PRODUCT: ProductInfo = {
  name: 'Page Lens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.1.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
  features: ['On-Device AI', '8 Page Types', 'Zero Config'],
  painPoint: 'copy-pasting articles into ChatGPT',
  coreBenefit: 'instant structured AI summaries',
  targetAudience: 'researchers, developers, PMs',
  platform: 'chrome',
};

const PRODUCT_CONFIG: ProductConfig = {
  name: 'Page Lens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.1.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
  locale: 'en',
};

describe('StrategyEngine', () => {
  it('应能生成 Product Hunt 推广文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('product_hunt');
    expect(content.title).toContain('Page Lens');
    expect(content.body).toContain('zero configuration');
    expect(content.tags).toContain('productivity');
  });

  it('应能生成 Reddit 推广文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('reddit');
    expect(content.body).toContain('Page Lens');
  });

  it('应能生成 Hacker News Show HN 文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('hacker_news');
    expect(content.title).toContain('Show HN');
  });

  it('应能生成 Twitter Thread 文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('twitter');
    expect(content.body).toContain('Thread');
  });

  it('应能在事件触发时自动评估推广策略', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    engine.registerTrigger({
      event: 'version_release',
      channels: ['product_hunt', 'hacker_news'],
      autoAction: 'notification',
    });
    const results = engine.evaluate({ type: 'version_release' });
    expect(results).toHaveLength(2);
    expect(results[0].channel).toBe('product_hunt');
  });

  it('应返回推荐推广策略', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const strategies = engine.getRecommendedStrategies();
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies[0].platform).toBe('chrome');
  });
});
