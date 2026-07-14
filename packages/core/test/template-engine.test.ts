import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine } from '../src/templates/template-engine';
import type { GrowthTemplate } from '../src/templates/types';
import type { PlatformAdapter } from '../src/adapter';

function createMockAdapter(locale = 'en'): PlatformAdapter {
  return {
    storage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    ui: { showRatingPrompt: vi.fn(), showNotification: vi.fn(), showShareDialog: vi.fn() },
    links: { openStorePage: vi.fn(), openShareUrl: vi.fn(), getStoreUrl: vi.fn().mockReturnValue('') },
    device: { getPlatform: vi.fn().mockReturnValue('chrome'), getVersion: vi.fn().mockReturnValue('1.0.0'), getLocale: vi.fn().mockReturnValue(locale) },
  };
}

const TEST_TEMPLATE: GrowthTemplate = {
  id: 'test_template',
  type: 'trigger',
  name: 'Test Template',
  locales: {
    en: { title: 'Hello {name}!', body: 'Welcome to {productName}. {greeting}', cta: 'Try now' },
    zh: { title: '你好 {name}！', body: '欢迎来到 {productName}。{greeting}', cta: '立即试用' },
  },
  variables: [
    { name: 'name', type: 'string', required: true, source: 'custom' },
    { name: 'productName', type: 'string', required: true, source: 'product' },
    { name: 'greeting', type: 'string', required: false, source: 'custom', defaultValue: 'Enjoy!' },
  ],
  platforms: ['chrome'],
};

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let adapter: PlatformAdapter;

  beforeEach(async () => {
    adapter = createMockAdapter();
    engine = new TemplateEngine(adapter, { name: 'PageLens', tagline: '', version: '1.0.0', storeUrl: '', locale: 'en' });
    await engine.init();
  });

  it('应能注册模板', () => {
    engine.register(TEST_TEMPLATE);
    expect(engine.getRegistered()).toHaveLength(1);
  });

  it('应能渲染模板并替换变量', () => {
    engine.register(TEST_TEMPLATE);
    const result = engine.render('test_template', {
      variables: { name: 'Alice', productName: 'PageLens' },
    });
    expect(result.title).toBe('Hello Alice!');
    expect(result.body).toContain('PageLens');
    expect(result.body).toContain('Enjoy!');
  });

  it('应使用指定语言渲染', () => {
    engine.register(TEST_TEMPLATE);
    const result = engine.render('test_template', {
      locale: 'zh',
      variables: { name: '小明', productName: 'PageLens' },
    });
    expect(result.title).toBe('你好 小明！');
    expect(result.locale).toBe('zh');
  });

  it('应回退到 en 语言', () => {
    engine.register(TEST_TEMPLATE);
    const result = engine.render('test_template', {
      locale: 'ja',
      variables: { name: 'Tanaka', productName: 'PageLens' },
    });
    expect(result.locale).toBe('en');
    expect(result.title).toBe('Hello Tanaka!');
  });

  it('缺少必填变量时应抛出错误', () => {
    engine.register(TEST_TEMPLATE);
    expect(() => engine.render('test_template', { variables: { name: 'Alice' } }))
      .toThrow(/productName/);
  });

  it('未注册的模板应抛出错误', () => {
    expect(() => engine.render('nonexistent', {}))
      .toThrow(/not found/);
  });
});
