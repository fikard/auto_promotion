/**
 * Chrome 适配器集成测试
 * 验证：存储持久化 → UI 组件交互 → 链接跳转 → 设备信息 → 与 SDK 联合使用
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowthSDK } from '../packages/core/src/engine';
import { ChromeAdapter } from '../packages/adapter-chrome/src/index';
import type { PlatformAdapter } from '../packages/core/src/adapter';
import { createMockAnalyticsProvider, TEST_PRODUCT } from './helpers';

// 模拟 chrome API
const chromeStore: Record<string, unknown> = {};

function setupChromeMocks() {
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (keys: string | string[]) => {
          const result: Record<string, unknown> = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const key of keyList) {
            if (chromeStore[key] !== undefined) result[key] = chromeStore[key];
          }
          return result;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(chromeStore, items);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const key of keyList) delete chromeStore[key];
        }),
      },
    },
    runtime: {
      getManifest: vi.fn().mockReturnValue({ version: '1.1.0' }),
    },
  };
}

function cleanupChromeMocks() {
  delete (globalThis as any).chrome;
  Object.keys(chromeStore).forEach(k => delete chromeStore[k]);
}

describe('Chrome 适配器集成', () => {
  beforeEach(() => {
    setupChromeMocks();
  });

  afterAll(() => {
    cleanupChromeMocks();
  });

  describe('存储持久化', () => {
    it('应能写入和读取数据', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://chrome.google.com/webstore/detail/test' });

      await adapter.storage.set('user_settings', { theme: 'dark', language: 'en' });
      const settings = await adapter.storage.get<{ theme: string; language: string }>('user_settings');
      expect(settings).toEqual({ theme: 'dark', language: 'en' });
    });

    it('不存在的 key 应返回 null', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      const result = await adapter.storage.get('nonexistent_key');
      expect(result).toBeNull();
    });

    it('删除后应返回 null', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });

      await adapter.storage.set('temp_key', 'temp_value');
      expect(await adapter.storage.get('temp_key')).toBe('temp_value');

      await adapter.storage.remove('temp_key');
      expect(await adapter.storage.get('temp_key')).toBeNull();
    });

    it('应支持复杂对象存储', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      const complex = {
        triggers: [
          { id: 'test', action: 'shown', timestamp: Date.now() },
        ],
        counts: { a: 1, b: 2 },
      };

      await adapter.storage.set('complex', complex);
      const result = await adapter.storage.get<typeof complex>('complex');
      expect(result).toEqual(complex);
    });

    it('storage key 应带前缀避免冲突', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      await adapter.storage.set('my_key', 'my_value');

      // 验证 chrome.storage.local.set 被调用了带前缀的 key
      const setCalls = vi.mocked((globalThis as any).chrome.storage.local.set).mock.calls;
      const lastCall = setCalls[setCalls.length - 1];
      const key = Object.keys(lastCall[0])[0];
      expect(key).toContain('growth_sdk_');
    });
  });

  describe('设备信息', () => {
    it('应返回正确的平台信息', () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      expect(adapter.device.getPlatform()).toBe('chrome');
    });

    it('应从 manifest 获取版本号', () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      expect(adapter.device.getVersion()).toBe('1.1.0');
    });

    it('应从 navigator 获取语言', () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      const locale = adapter.device.getLocale();
      expect(typeof locale).toBe('string');
      expect(locale.length).toBeGreaterThan(0);
    });
  });

  describe('链接管理', () => {
    it('应返回配置的商店 URL', () => {
      const url = 'https://chrome.google.com/webstore/detail/abc123';
      const adapter = new ChromeAdapter({ storeUrl: url });
      expect(adapter.links.getStoreUrl()).toBe(url);
    });

    it('openStorePage 应调用 window.open', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      adapter.links.openStorePage();
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank');
      openSpy.mockRestore();
    });
  });

  describe('UI 组件', () => {
    it('showNotification 应创建 Toast DOM 元素', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
      await adapter.ui.showNotification({
        title: 'Test Title',
        message: 'Test Message',
        type: 'info',
        duration: 1000,
      });

      // DOM body 中应存在 toast 子元素
      const children = document.body.children;
      expect(children.length).toBeGreaterThan(0);
    });

    it('showRatingPrompt 应创建弹窗 DOM 元素', async () => {
      const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });

      // 不等待 Promise（用户需要点击按钮才 resolve）
      const promise = adapter.ui.showRatingPrompt({
        title: 'Enjoying PageLens?',
        message: 'Please rate us!',
        options: [
          { emoji: '😊', label: 'Love it!', action: 'open_store' },
          { emoji: '😐', label: 'It\'s okay', action: 'show_feedback' },
        ],
        storeUrl: 'https://example.com',
      });

      // DOM body 中应存在弹窗
      const children = document.body.children;
      expect(children.length).toBeGreaterThan(0);

      // 模拟用户点击
      const button = document.querySelector('button');
      if (button) {
        button.click();
        const result = await promise;
        expect(result.type).toBeTruthy();
      }
    });
  });

  describe('与 SDK 联合使用', () => {
    it('GrowthSDK + ChromeAdapter 完整集成', async () => {
      const adapter = new ChromeAdapter({
        storeUrl: 'https://chrome.google.com/webstore/detail/pagelens',
      });
      const analytics = createMockAnalyticsProvider();

      const sdk = new GrowthSDK({
        adapter,
        product: TEST_PRODUCT,
        analytics: { provider: analytics.provider },
      });

      await sdk.init();

      // 验证初始化事件
      expect(analytics.events.some(e => e.name === 'sdk_initialized')).toBe(true);

      // 追踪事件
      sdk.analytics.track('chrome_extension_action', { action: 'summarize' });
      expect(analytics.events.some(e => e.name === 'chrome_extension_action')).toBe(true);

      // 生成推广内容
      const phContent = sdk.promotion.generate('product_hunt');
      expect(phContent.title).toContain('PageLens');

      // 评分弹窗（不等待，验证不报错）
      sdk.triggers.evaluate({ type: 'session_start' });

      sdk.dispose();
    });

    it('数据应在 SDK 实例间持久化', async () => {
      const adapter1 = new ChromeAdapter({ storeUrl: 'https://example.com' });
      const sdk1 = new GrowthSDK({ adapter: adapter1, product: TEST_PRODUCT });
      await sdk1.init();

      // 写入用户数据
      await adapter1.storage.set('user_profile', { userId: 'test-123', plan: 'free' });
      sdk1.dispose();

      // 新实例应能读取之前的数据
      const adapter2 = new ChromeAdapter({ storeUrl: 'https://example.com' });
      const profile = await adapter2.storage.get<{ userId: string; plan: string }>('user_profile');
      expect(profile).toEqual({ userId: 'test-123', plan: 'free' });
    });
  });
});
