/** 同意状态 */
export type ConsentState = 'unknown' | 'granted' | 'denied';

/** 默认敏感字段列表 */
const DEFAULT_SENSITIVE_FIELDS = ['email', 'phone', 'ip', 'ipAddress', 'phoneNumber', 'mail'];

/** ConsentManager 配置 */
export interface ConsentManagerOptions {
  defaultConsent?: ConsentState;
  anonymousMode?: boolean;
  sensitiveFields?: string[];
}

/** 隐私合规管理器 */
export class ConsentManager {
  /** 当前同意状态 */
  private _consentState: ConsentState;

  /** 匿名模式开关 */
  private _anonymousMode: boolean;

  /** 敏感字段列表 */
  private _sensitiveFields: Set<string>;

  constructor(options?: ConsentManagerOptions) {
    this._consentState = options?.defaultConsent ?? 'unknown';
    this._anonymousMode = options?.anonymousMode ?? false;
    this._sensitiveFields = new Set([
      ...DEFAULT_SENSITIVE_FIELDS,
      ...(options?.sensitiveFields ?? []),
    ]);
  }

  /** 获取当前同意状态 */
  get consentState(): ConsentState {
    return this._consentState;
  }

  /** 授予同意 */
  grant(): void {
    this._consentState = 'granted';
  }

  /** 拒绝同意 */
  deny(): void {
    this._consentState = 'denied';
  }

  /** 检查是否已授权 */
  isGranted(): boolean {
    return this._consentState === 'granted';
  }

  /** 获取匿名模式状态 */
  get anonymousMode(): boolean {
    return this._anonymousMode;
  }

  /** 设置匿名模式 */
  setAnonymousMode(enabled: boolean): void {
    this._anonymousMode = enabled;
  }

  /** 脱敏：移除 properties 中的敏感字段 */
  sanitize(properties: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!this._sensitiveFields.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }
}
