import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriggerEngine } from '../src/triggers/trigger-engine';
import type { Trigger, UserEvent } from '../src/triggers/types';
import type { PlatformAdapter } from '../src/adapter';
import { createSecondSessionRating, createUsageCountRating } from '../src/triggers/built-in/usage-count';
import { createInactiveReactivate } from '../src/triggers/built-in/inactive';

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
      getStoreUrl: vi.fn().mockReturnValue('https://example.com'),
    },
    device: {
      getPlatform: vi.fn().mockReturnValue('chrome'),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
      getLocale: vi.fn().mockReturnValue('en'),
    },
  };
}

describe('TriggerEngine', () => {
  let engine: TriggerEngine;
  let adapter: PlatformAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    engine = new TriggerEngine(adapter);
  });

  it('应能注册触发器', () => {
    const trigger: Trigger = {
      id: 'test_trigger',
      name: 'Test',
      condition: { type: 'usage_count', params: { sessionCount: 2 } },
      actions: [{ type: 'show_rating', config: {} }],
      cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
      enabled: true,
    };
    engine.register(trigger);
    expect(engine.getRegistered()).toHaveLength(1);
  });

  it('应能根据使用次数触发动作', async () => {
    engine.register({
      id: 'second_session',
      name: 'Second Session Rating',
      condition: { type: 'usage_count', params: { sessionCount: 2 } },
      actions: [{ type: 'show_rating', config: { title: 'Enjoying it?' } }],
      cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
      enabled: true,
    });

    // 模拟已有一个 session
    vi.mocked(adapter.storage.get).mockResolvedValue({
      sessionCount: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      triggerHistory: [],
      triggerCounts: {},
      dailyTriggerCounts: {},
    });

    await engine.loadState();
    await engine.evaluate({ type: 'session_start', properties: { sessionCount: 2 } });
    expect(adapter.ui.showRatingPrompt).toHaveBeenCalled();
  });

  it('应在冷却期内不重复触发', async () => {
    engine.register({
      id: 'cool_test',
      name: 'Cooldown Test',
      condition: { type: 'usage_count', params: { sessionCount: 1 } },
      actions: [{ type: 'show_rating', config: {} }],
      cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
      enabled: true,
    });

    vi.mocked(adapter.storage.get).mockResolvedValue({
      sessionCount: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      triggerHistory: [{ triggerId: 'cool_test', action: 'shown' as const, timestamp: Date.now() }],
      triggerCounts: { cool_test: 1 },
      dailyTriggerCounts: {},
    });

    await engine.loadState();
    await engine.evaluate({ type: 'session_start', properties: { sessionCount: 1 } });
    expect(adapter.ui.showRatingPrompt).not.toHaveBeenCalled();
  });

  it('禁用的触发器不应执行', async () => {
    engine.register({
      id: 'disabled_trigger',
      name: 'Disabled',
      condition: { type: 'usage_count', params: { sessionCount: 1 } },
      actions: [{ type: 'show_rating', config: {} }],
      cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
      enabled: false,
    });

    await engine.loadState();
    await engine.evaluate({ type: 'session_start', properties: { sessionCount: 1 } });
    expect(adapter.ui.showRatingPrompt).not.toHaveBeenCalled();
  });

  it('应记录触发历史', async () => {
    engine.register({
      id: 'history_test',
      name: 'History Test',
      condition: { type: 'usage_count', params: { sessionCount: 1 } },
      actions: [{ type: 'show_rating', config: {} }],
      cooldown: { minDaysBetween: 0, maxTriggers: 100, dailyLimit: 100 },
      enabled: true,
    });

    await engine.loadState();
    await engine.evaluate({ type: 'session_start', properties: { sessionCount: 1 } });
    const history = engine.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].triggerId).toBe('history_test');
    expect(history[0].action).toBe('shown');
  });

  it('内置触发器工厂函数应生成正确的触发器', () => {
    const secondSession = createSecondSessionRating();
    expect(secondSession.id).toBe('second_session_rating');
    expect(secondSession.condition.type).toBe('usage_count');

    const usageCount = createUsageCountRating({ count: 10 });
    expect(usageCount.condition.params.sessionCount).toBe(10);

    const inactive = createInactiveReactivate({ thresholdDays: 21 });
    expect(inactive.condition.params.thresholdDays).toBe(21);
    expect(inactive.actions[0].type).toBe('send_email');
  });
});
