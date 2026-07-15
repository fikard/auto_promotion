/** Feature Flag 类型 */
export type FlagType = 'boolean' | 'variant' | 'percentage';

/** Feature Flag 定义 */
export interface FeatureFlag {
  key: string;
  type: FlagType;
  enabled: boolean;
  /** boolean 类型：是否启用 */
  defaultValue: boolean | string | number;
  /** percentage 类型：0-100 的流量百分比 */
  percentage?: number;
  /** variant 类型：可选变体列表 */
  variants?: Array<{ name: string; weight: number }>;
  /** 目标用户规则 */
  rules?: FlagRule[];
  /** 远程配置值（JSON URL 或内联对象） */
  remoteConfig?: string | Record<string, unknown>;
}

/** 标记规则 */
export interface FlagRule {
  field: string;          // 'platform' | 'locale' | 'version' | 'userId' | custom
  operator: 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'contains';
  value: unknown;
}

/** Flag 评估上下文 */
export interface FlagContext {
  platform?: string;
  locale?: string;
  version?: string;
  userId?: string;
  [key: string]: unknown;
}

/** Flag 评估结果 */
export interface FlagResult {
  key: string;
  value: boolean | string | number;
  reason: 'default' | 'rule_match' | 'percentage' | 'variant' | 'disabled';
}
