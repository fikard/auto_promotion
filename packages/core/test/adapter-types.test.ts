import { describe, it, expect } from 'vitest';
import type {
  PlatformType,
  RatingAction,
  ProductConfig,
  GrowthSDKConfig,
  PlatformAdapter,
} from '../src/adapter';

describe('PlatformAdapter 类型约束', () => {
  it('PlatformType 应包含所有支持的平台', () => {
    const platforms: PlatformType[] = ['chrome', 'vscode', 'shopify', 'figma', 'wordpress', 'notion', 'web'];
    expect(platforms).toHaveLength(7);
  });

  it('RatingAction 应约束为三种类型', () => {
    const actions: RatingAction[] = [
      { type: 'open_store' },
      { type: 'show_feedback' },
      { type: 'dismiss' },
    ];
    expect(actions).toHaveLength(3);
  });

  it('ProductConfig 必须包含 name 和 storeUrl', () => {
    const product: ProductConfig = {
      name: 'PageLens',
      tagline: 'Free AI Summarizer',
      version: '1.1.0',
      storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
      supportUrl: 'https://github.com/fikard/web_plugins/issues',
      locale: 'en',
    };
    expect(product.name).toBe('PageLens');
    expect(product.storeUrl).toContain('chrome');
  });

  it('GrowthSDKConfig 必须包含 adapter 和 product', () => {
    const mockAdapter: PlatformAdapter = {
      storage: {
        get: async () => null,
        set: async () => {},
        remove: async () => {},
      },
      ui: {
        showRatingPrompt: async () => ({ type: 'dismiss' as const }),
        showNotification: async () => {},
        showShareDialog: async () => {},
      },
      links: {
        openStorePage: () => {},
        openShareUrl: () => {},
        getStoreUrl: () => 'https://example.com',
      },
      device: {
        getPlatform: () => 'chrome',
        getVersion: () => '1.0.0',
        getLocale: () => 'en',
      },
    };

    const config: GrowthSDKConfig = {
      adapter: mockAdapter,
      product: {
        name: 'Test',
        tagline: 'Test tagline',
        version: '1.0.0',
        storeUrl: 'https://example.com',
        locale: 'en',
      },
    };
    expect(config.adapter.device.getPlatform()).toBe('chrome');
  });
});
