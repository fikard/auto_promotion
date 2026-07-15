import type { PlatformAdapter, AnalyticsEvent } from '../adapter';
import type { Trigger, TriggerHistory, UserEvent, TriggerAction, TriggerCondition, CompositeCondition } from './types';

const STORAGE_KEY = 'growth_sdk_trigger_state';

interface TriggerState {
  sessionCount: number;
  lastActiveDate: string;
  triggerHistory: TriggerHistory[];
  triggerCounts: Record<string, number>;
  dailyTriggerCounts: Record<string, number>;
}

export class TriggerEngine {
  private triggers: Map<string, Trigger> = new Map();
  private history: TriggerHistory[] = [];
  private state: TriggerState;
  private adapter: PlatformAdapter;
  private onEvent?: (event: AnalyticsEvent) => void;

  constructor(adapter: PlatformAdapter, onEvent?: (event: AnalyticsEvent) => void) {
    this.adapter = adapter;
    this.onEvent = onEvent;
    this.state = {
      sessionCount: 0,
      lastActiveDate: new Date().toISOString().split('T')[0],
      triggerHistory: [],
      triggerCounts: {},
      dailyTriggerCounts: {},
    };
  }

  async loadState(): Promise<void> {
    const saved = await this.adapter.storage.get<TriggerState>(STORAGE_KEY);
    if (saved) {
      this.state = saved;
    }
    this.state.sessionCount++;
    this.state.lastActiveDate = new Date().toISOString().split('T')[0];
    await this.saveState();
  }

  register(trigger: Trigger): void {
    this.triggers.set(trigger.id, trigger);
  }

  getRegistered(): Trigger[] {
    return Array.from(this.triggers.values());
  }

  async evaluate(event: UserEvent): Promise<void> {
    const timestamp = event.timestamp ?? Date.now();

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;
      if (!this.matchesCondition(trigger, event)) continue;
      if (!this.checkCooldown(trigger, timestamp)) continue;

      await this.executeActions(trigger.actions);

      const record: TriggerHistory = {
        triggerId: trigger.id,
        action: 'shown',
        timestamp,
      };
      this.history.push(record);
      this.state.triggerHistory.push(record);
      this.state.triggerCounts[trigger.id] = (this.state.triggerCounts[trigger.id] ?? 0) + 1;

      const today = new Date(timestamp).toISOString().split('T')[0];
      const dailyKey = `${today}:${trigger.id}`;
      this.state.dailyTriggerCounts[dailyKey] = (this.state.dailyTriggerCounts[dailyKey] ?? 0) + 1;

      await this.saveState();

      this.onEvent?.({
        name: 'trigger_shown',
        properties: { triggerId: trigger.id },
        timestamp,
      });
    }
  }

  getHistory(): TriggerHistory[] {
    return [...this.history];
  }

  private matchesCondition(trigger: Trigger, event: UserEvent): boolean {
    return this.evaluateCondition(trigger.condition, event);
  }

  private evaluateCondition(condition: TriggerCondition | CompositeCondition, event: UserEvent): boolean {
    // 组合条件：递归评估子条件
    if ('operator' in condition) {
      if (condition.operator === 'and') {
        return condition.conditions.every(c => this.evaluateCondition(c, event));
      } else {
        return condition.conditions.some(c => this.evaluateCondition(c, event));
      }
    }
    // 原子条件逻辑
    switch (condition.type) {
      case 'usage_count': {
        const targetCount = condition.params.sessionCount as number;
        return this.state.sessionCount >= targetCount;
      }
      case 'days_inactive': {
        const threshold = condition.params.thresholdDays as number;
        const lastActive = new Date(this.state.lastActiveDate);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= threshold;
      }
      case 'feature_complete': {
        const featureId = condition.params.featureId as string;
        return event.type === 'feature_complete' && event.properties?.featureId === featureId;
      }
      case 'payment': {
        return event.type === 'payment_completed';
      }
      case 'milestone': {
        const milestoneType = condition.params.milestoneType as string;
        return event.type === 'milestone_reached' && event.properties?.milestoneType === milestoneType;
      }
      case 'custom': {
        return event.type === (condition.params.eventType as string);
      }
      default:
        return false;
    }
  }

  private checkCooldown(trigger: Trigger, timestamp: number): boolean {
    const { cooldown } = trigger;
    const totalTriggers = this.state.triggerCounts[trigger.id] ?? 0;
    if (totalTriggers >= cooldown.maxTriggers) return false;

    const today = new Date(timestamp).toISOString().split('T')[0];
    const dailyKey = `${today}:${trigger.id}`;
    const dailyTriggers = this.state.dailyTriggerCounts[dailyKey] ?? 0;
    if (dailyTriggers >= cooldown.dailyLimit) return false;

    if (cooldown.minDaysBetween > 0 && totalTriggers > 0) {
      const lastTrigger = this.state.triggerHistory
        .filter(h => h.triggerId === trigger.id)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (lastTrigger) {
        const daysSinceLast = (timestamp - lastTrigger.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < cooldown.minDaysBetween) return false;
      }
    }

    return true;
  }

  private async executeActions(actions: TriggerAction[]): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'show_rating':
          await this.adapter.ui.showRatingPrompt(action.config as any);
          break;
        case 'show_notification':
          await this.adapter.ui.showNotification(action.config as any);
          break;
        case 'show_share':
          await this.adapter.ui.showShareDialog(action.config as any);
          break;
        case 'send_email':
          this.onEvent?.({
            name: 'email_triggered',
            properties: { templateId: action.config.templateId },
          });
          break;
        case 'custom':
          this.onEvent?.({
            name: 'custom_action',
            properties: action.config,
          });
          break;
      }
    }
  }

  async saveState(): Promise<void> {
    await this.adapter.storage.set(STORAGE_KEY, this.state);
  }
}
