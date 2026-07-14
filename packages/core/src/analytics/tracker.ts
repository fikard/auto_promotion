import type { AnalyticsEvent, AnalyticsProvider } from './types';

export class Tracker {
  private provider: AnalyticsProvider | null = null;
  private eventBuffer: AnalyticsEvent[] = [];
  private userId: string | null = null;
  private userTraits: Record<string, unknown> = {};

  constructor(provider?: AnalyticsProvider) {
    if (provider) {
      this.provider = provider;
      this.provider.init({});
    }
  }

  track(name: string, properties?: Record<string, unknown>): void {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId: this.userId ?? undefined,
    };
    this.eventBuffer.push(event);
    this.provider?.track(event);
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    this.userId = userId;
    if (traits) this.userTraits = { ...this.userTraits, ...traits };
    this.provider?.identify(userId, traits);
  }

  getBuffer(): AnalyticsEvent[] {
    return [...this.eventBuffer];
  }

  clearBuffer(): void {
    this.eventBuffer = [];
  }
}
