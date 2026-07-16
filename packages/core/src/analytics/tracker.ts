import type { AnalyticsEvent, AnalyticsProvider } from './types';
import type { PlatformAdapter } from '../adapter';
import { ConsentManager } from './consent';
import type { ConsentManagerOptions } from './consent';

/** 持久化队列的存储键 */
const QUEUE_STORAGE_KEY = 'growth_sdk_analytics_queue';

/** Tracker 配置 */
export interface TrackerOptions {
  provider?: AnalyticsProvider;
  adapter?: PlatformAdapter;
  flushInterval?: number;
  maxQueueSize?: number;
  consent?: ConsentManagerOptions;
  consentManager?: ConsentManager;
}

export class Tracker {
  private provider: AnalyticsProvider | null = null;
  private adapter: PlatformAdapter | null = null;
  private eventBuffer: AnalyticsEvent[] = [];
  private userId: string | null = null;
  private userTraits: Record<string, unknown> = {};

  /** 持久化队列：存储 provider 失败的事件 */
  private persistentQueue: AnalyticsEvent[] = [];

  /** 定期回放定时器 */
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  /** 最大队列容量 */
  private readonly maxQueueSize: number;

  /** 回放间隔（毫秒） */
  private readonly flushInterval: number;

  /** 隐私合规管理器 */
  readonly consent: ConsentManager;

  constructor(provider?: AnalyticsProvider, options?: TrackerOptions) {
    // 向后兼容：支持旧构造函数 Tracker(provider?)
    if (provider) {
      this.provider = provider;
      this.provider.init({});
    }

    this.adapter = options?.adapter ?? null;
    this.flushInterval = options?.flushInterval ?? 30_000;
    this.maxQueueSize = options?.maxQueueSize ?? 100;

    // 支持共享 ConsentManager 实例（由 GrowthSDK 传入）或独立创建
    if (options?.consentManager) {
      this.consent = options.consentManager;
    } else {
      this.consent = new ConsentManager(options?.consent);
    }

    // 启动定期回放
    this.startFlushTimer();
  }

  track(name: string, properties?: Record<string, unknown>): void {
    // 隐私合规：如果同意状态为 denied，不发送事件
    if (this.consent.consentState === 'denied') return;

    // 隐私合规：脱敏 properties
    const sanitizedProperties = properties
      ? this.consent.sanitize(properties)
      : undefined;

    // 隐私合规：匿名模式下移除 userId
    const userId = this.consent.anonymousMode ? undefined : (this.userId ?? undefined);

    const event: AnalyticsEvent = {
      name,
      properties: sanitizedProperties,
      timestamp: Date.now(),
      userId,
    };
    this.eventBuffer.push(event);

    // 先尝试回放队列中的事件
    this.replayQueue();

    // 尝试发送当前事件
    if (this.provider) {
      try {
        this.provider.track(event);
      } catch {
        // provider 失败，存入持久化队列
        this.enqueue(event);
      }
    }
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

  /** 获取持久化队列中的事件数量 */
  getQueueSize(): number {
    return this.persistentQueue.length;
  }

  /** 手动触发队列回放 */
  async flush(): Promise<void> {
    await this.replayQueue();
  }

  /** 销毁 Tracker，停止定时器 */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ─── 私有方法 ───

  /** 启动定期回放定时器 */
  private startFlushTimer(): void {
    if (this.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.replayQueue();
      }, this.flushInterval);
    }
  }

  /** 将失败事件存入持久化队列 */
  private enqueue(event: AnalyticsEvent): void {
    this.persistentQueue.push(event);

    // 超出容量时丢弃最旧事件
    if (this.persistentQueue.length > this.maxQueueSize) {
      this.persistentQueue.shift();
    }

    // 异步持久化到存储
    this.persistQueue();
  }

  /** 回放持久化队列中的事件 */
  private async replayQueue(): Promise<void> {
    if (this.persistentQueue.length === 0 || !this.provider) return;

    // 取出当前队列的快照
    const events = [...this.persistentQueue];
    const succeeded: number[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        this.provider.track(events[i]);
        succeeded.push(i);
      } catch {
        // 仍然失败，停止回放
        break;
      }
    }

    if (succeeded.length > 0) {
      // 移除成功发送的事件
      this.persistentQueue = this.persistentQueue.slice(succeeded.length);
      await this.persistQueue();
    }
  }

  /** 将队列持久化到存储 */
  private async persistQueue(): Promise<void> {
    if (!this.adapter) return;
    try {
      await this.adapter.storage.set(QUEUE_STORAGE_KEY, this.persistentQueue);
    } catch {
      // 存储失败时静默处理，不影响主流程
    }
  }

  /** 从存储中恢复队列（供初始化时调用） */
  async restoreQueue(): Promise<void> {
    if (!this.adapter) return;
    try {
      const saved = await this.adapter.storage.get<AnalyticsEvent[]>(QUEUE_STORAGE_KEY);
      if (saved && Array.isArray(saved)) {
        this.persistentQueue = saved.slice(0, this.maxQueueSize);
      }
    } catch {
      // 恢复失败时静默处理
    }
  }
}
