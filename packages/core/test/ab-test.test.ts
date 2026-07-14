import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ABTestAllocator } from '../src/templates/ab-test';
import type { PlatformAdapter } from '../src/adapter';
import type { TemplateVariant } from '../src/templates/types';

function createMockAdapter(): PlatformAdapter {
  const store: Record<string, unknown> = {};
  return {
    storage: {
      get: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
      set: vi.fn((key: string, value: unknown) => { store[key] = value; return Promise.resolve(); }),
      remove: vi.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
    },
    ui: { showRatingPrompt: vi.fn(), showNotification: vi.fn(), showShareDialog: vi.fn() },
    links: { openStorePage: vi.fn(), openShareUrl: vi.fn(), getStoreUrl: vi.fn().mockReturnValue('') },
    device: { getPlatform: vi.fn().mockReturnValue('chrome'), getVersion: vi.fn().mockReturnValue('1.0.0'), getLocale: vi.fn().mockReturnValue('en') },
  };
}

const VARIANTS: TemplateVariant[] = [
  { id: 'pain_first', name: '痛点先行', weight: 50, content: { body: 'pain' } },
  { id: 'feature_first', name: '功能先行', weight: 50, content: { body: 'feature' } },
];

describe('ABTestAllocator', () => {
  let allocator: ABTestAllocator;
  let adapter: PlatformAdapter;

  beforeEach(async () => {
    adapter = createMockAdapter();
    allocator = new ABTestAllocator(adapter);
    await allocator.load();
  });

  it('应返回分配的变体', async () => {
    const variant = await allocator.getVariant('test', VARIANTS);
    expect(variant).not.toBeNull();
    expect(['pain_first', 'feature_first']).toContain(variant!.id);
  });

  it('同一用户应始终获得同一变体', async () => {
    const first = await allocator.getVariant('consistent_test', VARIANTS);
    const second = await allocator.getVariant('consistent_test', VARIANTS);
    expect(first!.id).toBe(second!.id);
  });

  it('应支持强制指定变体', async () => {
    allocator.setVariant('forced_test', 'feature_first');
    const variant = await allocator.getVariant('forced_test', VARIANTS);
    expect(variant!.id).toBe('feature_first');
  });
});
