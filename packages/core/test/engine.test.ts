import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowthSDK } from '../src/engine';
import type { PlatformAdapter } from '../src/adapter';

function createMockAdapter(): PlatformAdapter {
  return {
    storage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    ui: {
      showRatingPrompt: vi.fn().mockResolvedValue({ type: 'open_store' }),
      showNotification: vi.fn().mockResolvedValue(undefined),
      showShareDialog: vi.fn().mockResolvedValue(undefined),
    },
    links: {
      openStorePage: vi.fn(),
      openShareUrl: vi.fn(),
      getStoreUrl: vi.fn().mockReturnValue('https://chrome.google.com/webstore/detail/xxx'),
    },
    device: {
      getPlatform: vi.fn().mockReturnValue('chrome'),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
      getLocale: vi.fn().mockReturnValue('en'),
    },
  };
}

describe('GrowthSDK', () => {
  let sdk: GrowthSDK;
  let adapter: PlatformAdapter;

  beforeEach(async () => {
    adapter = createMockAdapter();
    sdk = new GrowthSDK({
      adapter,
      product: {
        name: 'PageLens',
        tagline: 'Free AI Web Summarizer',
        version: '1.1.0',
        storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
        supportUrl: 'https://github.com/fikard/web_plugins/issues',
        locale: 'en',
      },
    });
    await sdk.init();
  });

  it('应成功初始化', () => {
    expect(true).toBe(true);
  });

  it('应提供触发器 API', () => {
    expect(typeof sdk.triggers.register).toBe('function');
    expect(typeof sdk.triggers.evaluate).toBe('function');
    expect(typeof sdk.triggers.getHistory).toBe('function');
  });

  it('应提供模板 API', () => {
    expect(typeof sdk.templates.render).toBe('function');
    expect(typeof sdk.templates.register).toBe('function');
    expect(typeof sdk.templates.getVariant).toBe('function');
  });

  it('应提供推广 API', () => {
    expect(typeof sdk.promotion.generate).toBe('function');
    expect(typeof sdk.promotion.getRecommendedStrategies).toBe('function');
    expect(typeof sdk.promotion.registerTrigger).toBe('function');
    expect(typeof sdk.promotion.evaluate).toBe('function');
  });

  it('应提供分析 API', () => {
    expect(typeof sdk.analytics.track).toBe('function');
    expect(typeof sdk.analytics.identify).toBe('function');
  });

  it('dispose 后应可安全调用', () => {
    expect(() => sdk.dispose()).not.toThrow();
  });

  it('应能生成推广内容', () => {
    const content = sdk.promotion.generate('product_hunt');
    expect(content.title).toContain('PageLens');
  });

  it('应能追踪自定义事件', () => {
    expect(() => sdk.analytics.track('custom_event', { key: 'value' })).not.toThrow();
  });
});
