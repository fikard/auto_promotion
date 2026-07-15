import type { FeatureFlag, FlagContext, FlagResult, FlagRule } from './types';
import type { PlatformAdapter } from '../adapter';

export class FlagEngine {
  private flags: Map<string, FeatureFlag> = new Map();
  private context: FlagContext = {};
  private adapter: PlatformAdapter;
  private static STORAGE_KEY = 'growth_sdk_flag_state';

  constructor(adapter: PlatformAdapter, context?: FlagContext) {
    this.adapter = adapter;
    if (context) this.context = context;
  }

  /** 注册 Feature Flag */
  register(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  /** 批量注册 */
  registerAll(flags: FeatureFlag[]): void {
    for (const flag of flags) {
      this.register(flag);
    }
  }

  /** 评估 Flag 值 */
  evaluate(key: string, context?: FlagContext): FlagResult {
    const flag = this.flags.get(key);
    if (!flag) {
      return { key, value: false, reason: 'disabled' };
    }

    // 检查是否启用
    if (!flag.enabled) {
      return { key, value: flag.defaultValue, reason: 'disabled' };
    }

    const mergedContext = { ...this.context, ...context };

    // 匹配规则
    if (flag.rules && flag.rules.length > 0) {
      const matchedRule = flag.rules.find(rule => this.matchRule(rule, mergedContext));
      if (matchedRule) {
        return { key, value: true, reason: 'rule_match' };
      }
    }

    // 根据 type 处理
    if (flag.type === 'boolean') {
      return { key, value: flag.enabled, reason: 'default' };
    }

    if (flag.type === 'percentage') {
      const pct = flag.percentage ?? 0;
      const userId = mergedContext.userId ?? '';
      const hash = this.hashString(userId + key);
      const inPercentage = (hash % 100) < pct;
      return { key, value: inPercentage, reason: 'percentage' };
    }

    if (flag.type === 'variant' && flag.variants && flag.variants.length > 0) {
      const userId = mergedContext.userId ?? '';
      const hash = this.hashString(userId + key);
      const totalWeight = flag.variants.reduce((sum, v) => sum + v.weight, 0);
      let target = hash % totalWeight;
      for (const variant of flag.variants) {
        target -= variant.weight;
        if (target < 0) {
          return { key, value: variant.name, reason: 'variant' };
        }
      }
      // 兜底返回第一个变体
      return { key, value: flag.variants[0].name, reason: 'variant' };
    }

    return { key, value: flag.defaultValue, reason: 'default' };
  }

  /** 获取所有 Flag 状态 */
  evaluateAll(context?: FlagContext): Record<string, FlagResult> {
    const results: Record<string, FlagResult> = {};
    for (const key of this.flags.keys()) {
      results[key] = this.evaluate(key, context);
    }
    return results;
  }

  /** 更新运行时上下文 */
  setContext(context: FlagContext): void {
    this.context = { ...this.context, ...context };
  }

  /** 从远程配置加载 Flag 定义 */
  async loadRemoteConfig(url: string): Promise<void> {
    const response = await fetch(url);
    const config = await response.json();
    if (Array.isArray(config.flags)) {
      this.registerAll(config.flags);
    }
    await this.save();
  }

  /** 持久化 Flag 状态到存储 */
  async save(): Promise<void> {
    const data: Record<string, FeatureFlag> = {};
    for (const [key, flag] of this.flags) {
      data[key] = flag;
    }
    await this.adapter.storage.set(FlagEngine.STORAGE_KEY, data);
  }

  /** 从存储加载 Flag 状态 */
  async load(): Promise<void> {
    const data = await this.adapter.storage.get<Record<string, FeatureFlag>>(FlagEngine.STORAGE_KEY);
    if (data && typeof data === 'object') {
      for (const [key, flag] of Object.entries(data)) {
        this.flags.set(key, flag);
      }
    }
  }

  /** 规则匹配 */
  private matchRule(rule: FlagRule, context: FlagContext): boolean {
    const fieldValue = context[rule.field];
    switch (rule.operator) {
      case 'eq':
        return fieldValue === rule.value;
      case 'neq':
        return fieldValue !== rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(fieldValue);
      case 'gt':
        return typeof fieldValue === 'number' && typeof rule.value === 'number' && fieldValue > rule.value;
      case 'lt':
        return typeof fieldValue === 'number' && typeof rule.value === 'number' && fieldValue < rule.value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof rule.value === 'string' && fieldValue.includes(rule.value);
      default:
        return false;
    }
  }

  /** 简单字符串哈希 */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为 32 位整数
    }
    return Math.abs(hash);
  }
}
