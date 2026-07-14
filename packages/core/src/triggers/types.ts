/** 触发条件类型 */
export interface TriggerCondition {
  type: 'usage_count' | 'days_inactive' | 'feature_complete' | 'payment' | 'milestone' | 'custom';
  params: Record<string, unknown>;
}

/** 触发动作类型 */
export interface TriggerAction {
  type: 'show_rating' | 'show_share' | 'show_notification' | 'send_email' | 'custom';
  config: Record<string, unknown>;
}

/** 冷却配置 */
export interface CooldownConfig {
  minDaysBetween: number;
  maxTriggers: number;
  dailyLimit: number;
}

/** 触发器定义 */
export interface Trigger {
  id: string;
  name: string;
  condition: TriggerCondition;
  actions: TriggerAction[];
  cooldown: CooldownConfig;
  enabled: boolean;
}

/** 触发历史记录 */
export interface TriggerHistory {
  triggerId: string;
  action: 'shown' | 'accepted' | 'dismissed' | 'error';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** 用户行为事件（供触发器评估用） */
export interface UserEvent {
  type: string;
  timestamp?: number;
  properties?: Record<string, unknown>;
}
