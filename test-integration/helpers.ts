import { vi } from 'vitest';
import type { PlatformAdapter, AnalyticsProvider } from '../packages/core/src/adapter';

/**
 * 创建功能完整的 mock PlatformAdapter
 * - storage: 内存存储，模拟真实读写行为
 * - ui: 记录调用但不执行 DOM 操作
 * - links: 记录调用但不打开窗口
 * - device: 返回可配置的平台信息
 */
export function createMockAdapter(options?: {
  platform?: string;
  version?: string;
  locale?: string;
}): { adapter: PlatformAdapter; store: Map<string, unknown>; calls: Record<string, unknown[]> } {
  const store = new Map<string, unknown>();
  const calls: Record<string, unknown[]> = {
    storageGet: [],
    storageSet: [],
    showRatingPrompt: [],
    showNotification: [],
    showShareDialog: [],
    openStorePage: [],
    openShareUrl: [],
  };

  const adapter: PlatformAdapter = {
    storage: {
      get: vi.fn(async <T>(key: string): Promise<T | null> => {
        calls.storageGet.push(key);
        return (store.get(key) as T) ?? null;
      }),
      set: vi.fn(async (key: string, value: unknown): Promise<void> => {
        calls.storageSet.push({ key, value });
        store.set(key, value);
      }),
      remove: vi.fn(async (key: string): Promise<void> => {
        store.delete(key);
      }),
    },
    ui: {
      showRatingPrompt: vi.fn(async (config) => {
        calls.showRatingPrompt.push(config);
        return { type: 'open_store' as const };
      }),
      showNotification: vi.fn(async (config) => {
        calls.showNotification.push(config);
      }),
      showShareDialog: vi.fn(async (config) => {
        calls.showShareDialog.push(config);
      }),
    },
    links: {
      openStorePage: vi.fn(() => {
        calls.openStorePage.push(null);
      }),
      openShareUrl: vi.fn((url: string) => {
        calls.openShareUrl.push(url);
      }),
      getStoreUrl: vi.fn(() => 'https://chrome.google.com/webstore/detail/test-extension'),
    },
    device: {
      getPlatform: vi.fn(() => (options?.platform ?? 'chrome') as any),
      getVersion: vi.fn(() => options?.version ?? '1.1.0'),
      getLocale: vi.fn(() => options?.locale ?? 'en'),
    },
  };

  return { adapter, store, calls };
}

/**
 * 创建 mock AnalyticsProvider
 * - 记录所有 track/identify 调用
 */
export function createMockAnalyticsProvider(): {
  provider: AnalyticsProvider;
  events: Array<{ name: string; properties?: Record<string, unknown> }>;
  identities: Array<{ userId: string; traits?: Record<string, unknown> }>;
} {
  const events: Array<{ name: string; properties?: Record<string, unknown> }> = [];
  const identities: Array<{ userId: string; traits?: Record<string, unknown> }> = [];

  const provider: AnalyticsProvider = {
    name: 'mock-analytics',
    init: vi.fn(),
    track: vi.fn((event) => {
      events.push({ name: event.name, properties: event.properties });
    }),
    identify: vi.fn((userId, traits) => {
      identities.push({ userId, traits });
    }),
  };

  return { provider, events, identities };
}

/**
 * 常用产品配置
 */
export const TEST_PRODUCT = {
  name: 'PageLens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.1.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/pagelens-abc123',
  supportUrl: 'https://github.com/fikard/web_plugins/issues',
  locale: 'en',
};

export const TEST_PRODUCT_INFO = {
  name: 'PageLens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.1.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/pagelens-abc123',
  features: ['On-Device AI', '8 Page Types', 'Zero Config', 'Privacy First'],
  painPoint: 'copy-pasting articles into ChatGPT one by one',
  coreBenefit: 'instant structured AI summaries directly in your browser',
  targetAudience: 'researchers, developers, and PMs who read lots of web content',
  platform: 'chrome' as const,
};
