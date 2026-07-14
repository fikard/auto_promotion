import { describe, it, expect, vi } from 'vitest';
import { Tracker } from '../src/analytics/tracker';
import type { AnalyticsProvider } from '../src/analytics/types';

function createMockProvider(): AnalyticsProvider {
  return {
    name: 'mock',
    init: vi.fn(),
    track: vi.fn(),
    identify: vi.fn(),
  };
}

describe('Tracker', () => {
  it('应能追踪事件', () => {
    const tracker = new Tracker();
    tracker.track('test_event', { foo: 'bar' });
    expect(tracker.getBuffer()).toHaveLength(1);
    expect(tracker.getBuffer()[0].name).toBe('test_event');
  });

  it('应能设置用户标识', () => {
    const provider = createMockProvider();
    const tracker = new Tracker(provider);
    tracker.identify('user-123', { plan: 'free' });
    expect(provider.identify).toHaveBeenCalledWith('user-123', { plan: 'free' });
    tracker.track('action');
    expect(tracker.getBuffer()[0].userId).toBe('user-123');
  });

  it('应转发事件到 provider', () => {
    const provider = createMockProvider();
    const tracker = new Tracker(provider);
    tracker.track('sdk_initialized', { platform: 'chrome' });
    expect(provider.track).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sdk_initialized' }),
    );
  });

  it('无 provider 时仍能缓存事件', () => {
    const tracker = new Tracker();
    tracker.track('event1');
    tracker.track('event2');
    expect(tracker.getBuffer()).toHaveLength(2);
  });
});
