import { describe, it, expect, vi } from 'vitest';
import { ChromeAdapter } from '../src/index';

// Mock chrome API
const storageData: Record<string, unknown> = {};
(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          if (storageData[key] !== undefined) result[key] = storageData[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(storageData, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) delete storageData[key];
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    getManifest: vi.fn().mockReturnValue({ version: '1.1.0' }),
  },
};

describe('ChromeAdapter', () => {
  it('应实现 PlatformAdapter 接口', () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://chrome.google.com/webstore/detail/xxx' });
    expect(adapter.storage).toBeDefined();
    expect(adapter.ui).toBeDefined();
    expect(adapter.links).toBeDefined();
    expect(adapter.device).toBeDefined();
  });

  it('device 应返回 chrome 平台', () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
    expect(adapter.device.getPlatform()).toBe('chrome');
    expect(adapter.device.getVersion()).toBe('1.1.0');
  });

  it('storage 应能读写数据', async () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
    await adapter.storage.set('test_key', { foo: 'bar' });
    const result = await adapter.storage.get<{ foo: string }>('test_key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('storage get 对不存在的 key 应返回 null', async () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
    const result = await adapter.storage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('links 应返回正确的商店 URL', () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://chrome.google.com/webstore/detail/abc' });
    expect(adapter.links.getStoreUrl()).toBe('https://chrome.google.com/webstore/detail/abc');
  });
});
