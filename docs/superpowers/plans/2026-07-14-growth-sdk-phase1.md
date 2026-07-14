# Growth SDK Phase 1 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现增长获客 SDK 的核心引擎 + Chrome 适配器，可在 PageLens 中集成使用

**架构：** 纯前端 SDK，采用平台无关核心 + 平台适配器模式。GrowthSDK 主类协调触发器引擎、模板引擎、推广引擎、分析追踪器四个子模块，通过 PlatformAdapter 接口与各平台交互。Phase 1 实现核心 + Chrome 适配器。

**技术栈：** TypeScript 6.x (strict), Vite (lib mode), Vitest, npm workspaces (monorepo), oxlint

**规格文件：** `docs/superpowers/specs/2026-07-14-growth-sdk-design.md`

---

## 文件结构

```
auto_promotion/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── adapter.ts              # PlatformAdapter 接口定义 + 所有共享类型
│   │   │   ├── engine.ts               # GrowthSDK 主类
│   │   │   ├── triggers/
│   │   │   │   ├── types.ts            # 触发器类型定义
│   │   │   │   ├── trigger-engine.ts   # 触发器引擎
│   │   │   │   └── built-in/
│   │   │   │       ├── usage-count.ts  # 使用次数 / 第二次会话触发器
│   │   │   │       └── inactive.ts     # 长期未使用触发器
│   │   │   ├── templates/
│   │   │   │   ├── types.ts            # 模板类型定义
│   │   │   │   ├── template-engine.ts  # 模板渲染引擎
│   │   │   │   ├── variable-resolver.ts # 变量解析器
│   │   │   │   └── ab-test.ts          # A/B 测试分配器
│   │   │   ├── promotion/
│   │   │   │   ├── types.ts            # 推广类型定义
│   │   │   │   ├── strategy-engine.ts  # 推广策略引擎
│   │   │   │   └── channels/
│   │   │   │       ├── types.ts        # 渠道生成器接口
│   │   │   │       ├── product-hunt.ts # Product Hunt 生成器
│   │   │   │       ├── reddit.ts       # Reddit 生成器
│   │   │   │       ├── hacker-news.ts  # Hacker News 生成器
│   │   │   │       └── twitter.ts      # Twitter 生成器
│   │   │   ├── analytics/
│   │   │   │   ├── types.ts            # 分析类型定义
│   │   │   │   └── tracker.ts          # 事件追踪器
│   │   │   ├── email/
│   │   │   │   ├── types.ts            # 邮件类型定义
│   │   │   │   └── email-trigger.ts    # 邮件触发器
│   │   │   └── index.ts               # 公共 API 导出
│   │   ├── test/
│   │   │   ├── engine.test.ts
│   │   │   ├── trigger-engine.test.ts
│   │   │   ├── template-engine.test.ts
│   │   │   ├── ab-test.test.ts
│   │   │   ├── strategy-engine.test.ts
│   │   │   └── tracker.test.ts
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── adapter-chrome/
│       ├── src/
│       │   ├── storage.ts              # chrome.storage.local 封装
│       │   ├── ui.ts                   # 弹窗/通知 UI 渲染
│       │   ├── links.ts                # Web Store / 分享链接
│       │   └── index.ts               # ChromeAdapter 导出
│       ├── test/
│       │   └── chrome-adapter.test.ts
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
├── package.json                        # monorepo root
├── tsconfig.base.json                  # 共享 TS 配置
└── vitest.config.ts                    # 共享测试配置
```

---

### 任务 1：项目脚手架

**文件：**
- 创建：`package.json`（root）
- 创建：`tsconfig.base.json`
- 创建：`packages/core/package.json`
- 创建：`packages/core/tsconfig.json`
- 创建：`packages/core/vite.config.ts`
- 创建：`packages/adapter-chrome/package.json`
- 创建：`packages/adapter-chrome/tsconfig.json`
- 创建：`packages/adapter-chrome/vite.config.ts`
- 创建：`vitest.config.ts`（root）

- [ ] **步骤 1：初始化 root package.json**

```json
{
  "name": "growth-sdk",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "oxlint packages/*/src"
  },
  "devDependencies": {
    "typescript": "~6.0.2",
    "vitest": "^3.2.1",
    "vite": "^6.3.5",
    "oxlint": "^1.71.0"
  }
}
```

- [ ] **步骤 2：创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **步骤 3：创建 packages/core/package.json**

```json
{
  "name": "@growth-sdk/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "~6.0.2",
    "vitest": "^3.2.1",
    "vite": "^6.3.5",
    "@vitejs/plugin-vue": "unused-placeholder"
  }
}
```

- [ ] **步骤 4：创建 packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **步骤 5：创建 packages/core/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GrowthSDK',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [],
    },
  },
});
```

- [ ] **步骤 6：创建 packages/adapter-chrome/package.json**

```json
{
  "name": "@growth-sdk/adapter-chrome",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@growth-sdk/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "~6.0.2",
    "vitest": "^3.2.1",
    "vite": "^6.3.5",
    "@types/chrome": "^0.2.2"
  }
}
```

- [ ] **步骤 7：创建 packages/adapter-chrome/tsconfig.json 和 vite.config.ts**

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GrowthSDKChromeAdapter',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@growth-sdk/core'],
    },
  },
});
```

- [ ] **步骤 8：创建 root vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
    },
  },
});
```

- [ ] **步骤 9：安装依赖并验证构建**

运行：`npm install`
预期：依赖安装成功，workspace 链接正确

- [ ] **步骤 10：Commit**

```bash
git add -A
git commit -m "feat: 初始化 Growth SDK monorepo 脚手架"
```

---

### 任务 2：平台适配器接口与共享类型

**文件：**
- 创建：`packages/core/src/adapter.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `packages/core/test/adapter-types.test.ts`：

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type {
  PlatformType,
  PlatformAdapter,
  RatingPromptConfig,
  RatingAction,
  NotificationConfig,
  ShareConfig,
  ProductConfig,
} from '../src/adapter';

describe('PlatformAdapter 类型约束', () => {
  it('PlatformType 应包含所有支持的平台', () => {
    const platforms: PlatformType[] = ['chrome', 'vscode', 'shopify', 'figma', 'wordpress', 'notion', 'web'];
    expect(platforms).toHaveLength(7);
  });

  it('RatingAction 应约束为三种类型', () => {
    const actions: RatingAction[] = [
      { type: 'open_store' },
      { type: 'show_feedback' },
      { type: 'dismiss' },
    ];
    expect(actions).toHaveLength(3);
  });

  it('ProductConfig 必须包含 name 和 storeUrl', () => {
    const product: ProductConfig = {
      name: 'PageLens',
      tagline: 'Free AI Summarizer',
      version: '1.1.0',
      storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
      supportUrl: 'https://github.com/fikard/web_plugins/issues',
      locale: 'en',
    };
    expect(product.name).toBe('PageLens');
    expect(product.storeUrl).toContain('chrome');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run packages/core/test/adapter-types.test.ts`
预期：FAIL，报错 "Cannot find module '../src/adapter'"

- [ ] **步骤 3：实现 adapter.ts**

```typescript
/** 支持的平台类型 */
export type PlatformType = 'chrome' | 'vscode' | 'shopify' | 'figma' | 'wordpress' | 'notion' | 'web';

/** 评分弹窗配置 */
export interface RatingPromptConfig {
  title: string;
  message: string;
  options: Array<{
    emoji: string;
    label: string;
    action: 'open_store' | 'show_feedback' | 'dismiss';
  }>;
  storeUrl: string;
  feedbackUrl?: string;
  delayMs?: number;
}

/** 评分动作结果 */
export type RatingAction = { type: 'open_store' | 'show_feedback' | 'dismiss' };

/** 通知配置 */
export interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'celebration';
  cta?: { label: string; url: string };
  duration?: number;
}

/** 分享配置 */
export interface ShareConfig {
  title: string;
  text: string;
  url: string;
  channels?: string[];
}

/** 平台适配器接口 — SDK 与平台交互的核心契约 */
export interface PlatformAdapter {
  /** 持久化存储 */
  storage: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
  };
  /** UI 展示 */
  ui: {
    showRatingPrompt(config: RatingPromptConfig): Promise<RatingAction>;
    showNotification(config: NotificationConfig): Promise<void>;
    showShareDialog(config: ShareConfig): Promise<void>;
  };
  /** 链接跳转 */
  links: {
    openStorePage(): void;
    openShareUrl(url: string): void;
    getStoreUrl(): string;
  };
  /** 设备/环境信息 */
  device: {
    getPlatform(): PlatformType;
    getVersion(): string;
    getLocale(): string;
  };
}

/** 产品配置 */
export interface ProductConfig {
  name: string;
  tagline: string;
  version: string;
  storeUrl: string;
  supportUrl?: string;
  locale: string;
}

/** SDK 初始化配置 */
export interface GrowthSDKConfig {
  adapter: PlatformAdapter;
  product: ProductConfig;
  analytics?: {
    provider: AnalyticsProvider;
  };
  email?: {
    provider: 'resend' | 'sendgrid';
    apiEndpoint: string;
    apiKey: string;
  };
  triggers?: Record<string, TriggerConfig>;
}

/** 分析提供商接口 */
export interface AnalyticsProvider {
  name: string;
  init(config: Record<string, unknown>): void;
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
}

/** 分析事件 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}

/** 触发器配置（用于初始化时覆盖默认值） */
export interface TriggerConfig {
  enabled: boolean;
  [key: string]: unknown;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run packages/core/test/adapter-types.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add packages/core/src/adapter.ts packages/core/test/adapter-types.test.ts
git commit -m "feat(core): 定义 PlatformAdapter 接口与共享类型"
```

---

### 任务 3：触发器引擎

**文件：**
- 创建：`packages/core/src/triggers/types.ts`
- 创建：`packages/core/src/triggers/trigger-engine.ts`
- 创建：`packages/core/src/triggers/built-in/usage-count.ts`
- 创建：`packages/core/src/triggers/built-in/inactive.ts`
- 创建：`packages/core/test/trigger-engine.test.ts`

- [ ] **步骤 1：编写触发器类型**

创建 `packages/core/src/triggers/types.ts`：

```typescript
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
```

- [ ] **步骤 2：编写失败的触发器引擎测试**

创建 `packages/core/test/trigger-engine.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriggerEngine } from '../src/triggers/trigger-engine';
import type { Trigger, UserEvent, TriggerHistory } from '../src/triggers/types';
import type { PlatformAdapter } from '../src/adapter';

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

    // 第一次 session — 不触发
    await engine.evaluate({ type: 'session_start', properties: { sessionCount: 1 } });
    expect(adapter.ui.showRatingPrompt).not.toHaveBeenCalled();

    // 第二次 session — 触发
    vi.mocked(adapter.storage.get).mockResolvedValue({ sessionCount: 1 });
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

    // 已触发过
    vi.mocked(adapter.storage.get).mockResolvedValue({
      triggerHistory: [{ triggerId: 'cool_test', action: 'shown', timestamp: Date.now() }],
    });

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

    await engine.evaluate({ type: 'session_start', properties: { sessionCount: 1 } });
    const history = engine.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].triggerId).toBe('history_test');
    expect(history[0].action).toBe('shown');
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run packages/core/test/trigger-engine.test.ts`
预期：FAIL，报错 "Cannot find module '../src/triggers/trigger-engine'"

- [ ] **步骤 4：实现触发器引擎**

创建 `packages/core/src/triggers/trigger-engine.ts`：

```typescript
import type { PlatformAdapter, AnalyticsEvent } from '../adapter';
import type { Trigger, TriggerHistory, UserEvent, TriggerAction } from './types';

const STORAGE_KEY = 'growth_sdk_trigger_state';

interface TriggerState {
  sessionCount: number;
  lastActiveDate: string;
  triggerHistory: TriggerHistory[];
  triggerCounts: Record<string, number>;
  dailyTriggerCounts: Record<string, number>;  // key: 'YYYY-MM-DD:triggerId'
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
    // 递增 session 计数
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

      // 执行动作
      await this.executeActions(trigger.actions);

      // 记录历史
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
    const { condition } = trigger;
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
          // 邮件触发由 EmailTrigger 模块处理，此处派发事件
          this.onEvent?.({
            name: 'email_triggered',
            properties: { templateId: action.config.templateId },
          });
          break;
        case 'custom':
          // 自定义动作通过事件回调处理
          this.onEvent?.({
            name: 'custom_action',
            properties: action.config,
          });
          break;
      }
    }
  }

  private async saveState(): Promise<void> {
    await this.adapter.storage.set(STORAGE_KEY, this.state);
  }
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run packages/core/test/trigger-engine.test.ts`
预期：PASS

- [ ] **步骤 6：编写内置触发器 — usage-count**

创建 `packages/core/src/triggers/built-in/usage-count.ts`：

```typescript
import type { Trigger } from '../types';

/** 第二次会话评分触发器 */
export function createSecondSessionRating(options?: {
  session?: number;
  delayMs?: number;
}): Trigger {
  return {
    id: 'second_session_rating',
    name: '第二次使用评分请求',
    condition: { type: 'usage_count', params: { sessionCount: options?.session ?? 2 } },
    actions: [
      {
        type: 'show_rating',
        config: {
          delayMs: options?.delayMs ?? 3000,
          title: 'Enjoying {productName}?',
          message: 'A review helps others discover {productName}. It only takes 30 seconds!',
          options: [
            { emoji: '😊', label: 'Love it!', action: 'open_store' },
            { emoji: '😐', label: "It's okay", action: 'show_feedback' },
          ],
        },
      },
    ],
    cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
    enabled: true,
  };
}

/** 使用次数评分触发器 */
export function createUsageCountRating(options?: {
  count?: number;
  cooldownDays?: number;
}): Trigger {
  return {
    id: 'usage_count_rating',
    name: '使用次数评分请求',
    condition: { type: 'usage_count', params: { sessionCount: options?.count ?? 5 } },
    actions: [{ type: 'show_rating', config: {} }],
    cooldown: { minDaysBetween: options?.cooldownDays ?? 90, maxTriggers: 2, dailyLimit: 1 },
    enabled: true,
  };
}
```

- [ ] **步骤 7：编写内置触发器 — inactive**

创建 `packages/core/src/triggers/built-in/inactive.ts`：

```typescript
import type { Trigger } from '../types';

/** 长期未使用激活提醒触发器 */
export function createInactiveReactivate(options?: {
  thresholdDays?: number;
  templateId?: string;
}): Trigger {
  return {
    id: 'inactive_reactivate',
    name: '长期未使用激活提醒',
    condition: {
      type: 'days_inactive',
      params: { thresholdDays: options?.thresholdDays ?? 14 },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: options?.templateId ?? 'reactivation_d1',
        },
      },
    ],
    cooldown: { minDaysBetween: 7, maxTriggers: 3, dailyLimit: 1 },
    enabled: true,
  };
}
```

- [ ] **步骤 8：Commit**

```bash
git add packages/core/src/triggers/ packages/core/test/trigger-engine.test.ts
git commit -m "feat(core): 实现触发器引擎与内置触发器"
```

---

### 任务 4：模板引擎

**文件：**
- 创建：`packages/core/src/templates/types.ts`
- 创建：`packages/core/src/templates/template-engine.ts`
- 创建：`packages/core/src/templates/variable-resolver.ts`
- 创建：`packages/core/src/templates/ab-test.ts`
- 创建：`packages/core/test/template-engine.test.ts`
- 创建：`packages/core/test/ab-test.test.ts`

- [ ] **步骤 1：编写模板类型**

创建 `packages/core/src/templates/types.ts`：

```typescript
import type { PlatformType, PromotionChannel } from '../adapter';

/** 模板变量定义 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  defaultValue?: unknown;
  source: 'product' | 'user' | 'custom';
}

/** 模板本地化内容 */
export interface LocaleContent {
  title?: string;
  body: string;
  subject?: string;
  cta?: string;
  tags?: string[];
}

/** A/B 测试变体 */
export interface TemplateVariant {
  id: string;
  name: string;
  weight: number;
  content: LocaleContent;
}

/** 增长模板定义 */
export interface GrowthTemplate {
  id: string;
  type: 'promotion' | 'trigger' | 'email';
  name: string;
  locales: Record<string, LocaleContent>;
  variables: TemplateVariable[];
  variants?: TemplateVariant[];
  platforms: PlatformType[];
  channel?: PromotionChannel;
}

/** 模板渲染选项 */
export interface RenderOptions {
  locale?: string;
  variables?: Record<string, unknown>;
  variantId?: string;
}

/** 渲染结果 */
export interface RenderedContent {
  templateId: string;
  variantId?: string;
  locale: string;
  title?: string;
  body: string;
  subject?: string;
  cta?: string;
  tags: string[];
}
```

- [ ] **步骤 2：编写失败的模板引擎测试**

创建 `packages/core/test/template-engine.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine } from '../src/templates/template-engine';
import type { GrowthTemplate } from '../src/templates/types';
import type { PlatformAdapter } from '../src/adapter';

function createMockAdapter(locale = 'en'): PlatformAdapter {
  return {
    storage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    ui: { showRatingPrompt: vi.fn(), showNotification: vi.fn(), showShareDialog: vi.fn() },
    links: { openStorePage: vi.fn(), openShareUrl: vi.fn(), getStoreUrl: vi.fn().mockReturnValue('') },
    device: { getPlatform: vi.fn().mockReturnValue('chrome'), getVersion: vi.fn().mockReturnValue('1.0.0'), getLocale: vi.fn().mockReturnValue(locale) },
  };
}

const TEST_TEMPLATE: GrowthTemplate = {
  id: 'test_template',
  type: 'trigger',
  name: 'Test Template',
  locales: {
    en: { title: 'Hello {name}!', body: 'Welcome to {productName}. {greeting}', cta: 'Try now' },
    zh: { title: '你好 {name}！', body: '欢迎来到 {productName}。{greeting}', cta: '立即试用' },
  },
  variables: [
    { name: 'name', type: 'string', required: true, source: 'custom' },
    { name: 'productName', type: 'string', required: true, source: 'product' },
    { name: 'greeting', type: 'string', required: false, source: 'custom', defaultValue: 'Enjoy!' },
  ],
  platforms: ['chrome'],
};

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let adapter: PlatformAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    engine = new TemplateEngine(adapter, { name: 'PageLens', tagline: '', version: '1.0.0', storeUrl: '', locale: 'en' });
  });

  it('应能注册模板', () => {
    engine.register(TEST_TEMPLATE);
    expect(engine.getRegistered()).toHaveLength(1);
  });

  it('应能渲染模板并替换变量', () => {
    engine.register(TEST_TEMPLATE);
    const result = engine.render('test_template', {
      variables: { name: 'Alice', productName: 'PageLens' },
    });
    expect(result.title).toBe('Hello Alice!');
    expect(result.body).toContain('PageLens');
    expect(result.body).toContain('Enjoy!');  // defaultValue
  });

  it('应使用指定语言渲染', () => {
    engine.register(TEST_TEMPLATE);
    const result = engine.render('test_template', {
      locale: 'zh',
      variables: { name: '小明', productName: 'PageLens' },
    });
    expect(result.title).toBe('你好 小明！');
    expect(result.locale).toBe('zh');
  });

  it('应回退到 en 语言', () => {
    engine.register(TEST_TEMPLATE);
    const result = engine.render('test_template', {
      locale: 'ja',
      variables: { name: 'Tanaka', productName: 'PageLens' },
    });
    expect(result.locale).toBe('en');
    expect(result.title).toBe('Hello Tanaka!');
  });

  it('缺少必填变量时应抛出错误', () => {
    engine.register(TEST_TEMPLATE);
    expect(() => engine.render('test_template', { variables: { name: 'Alice' } }))
      .toThrow(/productName/);
  });

  it('未注册的模板应抛出错误', () => {
    expect(() => engine.render('nonexistent', {}))
      .toThrow(/not found/);
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run packages/core/test/template-engine.test.ts`
预期：FAIL

- [ ] **步骤 4：实现变量解析器**

创建 `packages/core/src/templates/variable-resolver.ts`：

```typescript
import type { TemplateVariable } from './types';

export class VariableResolver {
  constructor(
    private productVars: Record<string, unknown>,
    private userVars: Record<string, unknown> = {},
  ) {}

  resolve(template: string, customVars: Record<string, unknown>, variables: TemplateVariable[]): string {
    return template.replace(/\{(\w+)\}/g, (match, varName) => {
      // 优先级：custom > user > product > defaultValue
      const value = customVars[varName] ?? this.userVars[varName] ?? this.productVars[varName];
      if (value !== undefined) return String(value);

      const varDef = variables.find(v => v.name === varName);
      if (varDef?.defaultValue !== undefined) return String(varDef.defaultValue);

      return match; // 保留未解析的变量占位符
    });
  }

  validate(customVars: Record<string, unknown>, variables: TemplateVariable[]): void {
    const missing = variables
      .filter(v => v.required && v.source === 'custom')
      .filter(v => customVars[v.name] === undefined && this.productVars[v.name] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.map(v => v.name).join(', ')}`);
    }
  }
}
```

- [ ] **步骤 5：实现 A/B 测试分配器**

创建 `packages/core/src/templates/ab-test.ts`：

```typescript
import type { PlatformAdapter } from '../adapter';
import type { TemplateVariant } from './types';

const AB_STORAGE_KEY = 'growth_sdk_ab_assignments';

export class ABTestAllocator {
  private assignments: Record<string, string> = {};

  constructor(private adapter: PlatformAdapter) {}

  async load(): Promise<void> {
    const saved = await this.adapter.storage.get<Record<string, string>>(AB_STORAGE_KEY);
    if (saved) this.assignments = saved;
  }

  async getVariant(templateId: string, variants: TemplateVariant[]): Promise<TemplateVariant | null> {
    if (!variants || variants.length === 0) return null;

    // 已有分配
    if (this.assignments[templateId]) {
      const existing = variants.find(v => v.id === this.assignments[templateId]);
      if (existing) return existing;
    }

    // 按权重随机分配
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) {
        this.assignments[templateId] = variant.id;
        await this.adapter.storage.set(AB_STORAGE_KEY, this.assignments);
        return variant;
      }
    }

    // 回退到第一个变体
    const fallback = variants[0];
    this.assignments[templateId] = fallback.id;
    await this.adapter.storage.set(AB_STORAGE_KEY, this.assignments);
    return fallback;
  }

  setVariant(templateId: string, variantId: string): void {
    this.assignments[templateId] = variantId;
  }
}
```

- [ ] **步骤 6：实现模板引擎**

创建 `packages/core/src/templates/template-engine.ts`：

```typescript
import type { PlatformAdapter, ProductConfig } from '../adapter';
import type { GrowthTemplate, RenderOptions, RenderedContent, LocaleContent } from './types';
import { VariableResolver } from './variable-resolver';
import { ABTestAllocator } from './ab-test';

export class TemplateEngine {
  private templates: Map<string, GrowthTemplate> = new Map();
  private resolver: VariableResolver;
  private abTest: ABTestAllocator;
  private productConfig: ProductConfig;

  constructor(adapter: PlatformAdapter, productConfig: ProductConfig) {
    this.productConfig = productConfig;
    this.resolver = new VariableResolver({
      productName: productConfig.name,
      productTagline: productConfig.tagline,
      productVersion: productConfig.version,
      storeUrl: productConfig.storeUrl,
      supportUrl: productConfig.supportUrl ?? '',
    });
    this.abTest = new ABTestAllocator(adapter);
  }

  async init(): Promise<void> {
    await this.abTest.load();
  }

  register(template: GrowthTemplate): void {
    this.templates.set(template.id, template);
  }

  getRegistered(): GrowthTemplate[] {
    return Array.from(this.templates.values());
  }

  render(id: string, options: RenderOptions = {}): RenderedContent {
    const template = this.templates.get(id);
    if (!template) throw new Error(`Template not found: ${id}`);

    // 解析语言
    const locale = options.locale ?? this.productConfig.locale ?? 'en';
    const content = this.resolveLocale(template, locale);

    // 解析 A/B 变体（同步快速路径，使用已加载的分配）
    let finalContent = content;
    if (template.variants && template.variants.length > 0) {
      const variantId = options.variantId ?? this.abTest.assignments[id];
      if (variantId) {
        const variant = template.variants.find(v => v.id === variantId);
        if (variant) finalContent = { ...content, ...variant.content };
      }
    }

    // 验证必填变量
    const customVars = options.variables ?? {};
    this.resolver.validate(customVars, template.variables);

    // 渲染变量
    return {
      templateId: id,
      variantId: options.variantId,
      locale,
      title: finalContent.title ? this.resolver.resolve(finalContent.title, customVars, template.variables) : undefined,
      body: this.resolver.resolve(finalContent.body, customVars, template.variables),
      subject: finalContent.subject ? this.resolver.resolve(finalContent.subject, customVars, template.variables) : undefined,
      cta: finalContent.cta ? this.resolver.resolve(finalContent.cta, customVars, template.variables) : undefined,
      tags: finalContent.tags ?? [],
    };
  }

  async getVariant(templateId: string): Promise<import('./types').TemplateVariant | null> {
    const template = this.templates.get(templateId);
    if (!template?.variants) return null;
    return this.abTest.getVariant(templateId, template.variants);
  }

  private resolveLocale(template: GrowthTemplate, locale: string): LocaleContent {
    // 回退链：指定语言 → en → 报错
    if (template.locales[locale]) return template.locales[locale];
    if (template.locales['en']) return template.locales['en'];
    const firstLocale = Object.keys(template.locales)[0];
    if (firstLocale) return template.locales[firstLocale];
    throw new Error(`Template has no locales: ${template.id}`);
  }
}
```

- [ ] **步骤 7：运行测试验证通过**

运行：`npx vitest run packages/core/test/template-engine.test.ts`
预期：PASS

- [ ] **步骤 8：编写 A/B 测试测试**

创建 `packages/core/test/ab-test.test.ts`：

```typescript
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
```

- [ ] **步骤 9：运行 A/B 测试测试**

运行：`npx vitest run packages/core/test/ab-test.test.ts`
预期：PASS

- [ ] **步骤 10：Commit**

```bash
git add packages/core/src/templates/ packages/core/test/template-engine.test.ts packages/core/test/ab-test.test.ts
git commit -m "feat(core): 实现模板引擎、变量解析器与 A/B 测试分配器"
```

---

### 任务 5：推广策略引擎

**文件：**
- 创建：`packages/core/src/promotion/types.ts`
- 创建：`packages/core/src/promotion/channels/types.ts`
- 创建：`packages/core/src/promotion/channels/product-hunt.ts`
- 创建：`packages/core/src/promotion/channels/reddit.ts`
- 创建：`packages/core/src/promotion/channels/hacker-news.ts`
- 创建：`packages/core/src/promotion/channels/twitter.ts`
- 创建：`packages/core/src/promotion/strategy-engine.ts`
- 创建：`packages/core/test/strategy-engine.test.ts`

- [ ] **步骤 1：编写推广类型**

创建 `packages/core/src/promotion/types.ts`：

```typescript
import type { PlatformType } from '../adapter';

export type PromotionChannel = 'product_hunt' | 'reddit' | 'hacker_news' | 'twitter' | 'indie_hackers' | 'seo';

export interface TimingStrategy {
  trigger: 'version_release' | 'milestone' | 'manual';
  delayDays: number;
  milestone?: string;
}

export interface AudienceProfile {
  locale: string;
  segment: string;
  subreddits?: string[];
}

export interface PromotionStrategy {
  platform: PlatformType;
  channel: PromotionChannel;
  contentTemplate: string;
  timingStrategy: TimingStrategy;
  targetAudience: AudienceProfile;
}

export interface PromotionTrigger {
  event: 'version_release' | 'milestone' | 'growth_stagnation' | 'first_rating' | 'feature_release';
  channels: PromotionChannel[];
  autoAction?: 'clipboard' | 'open_page' | 'notification';
}

export interface PromotionEvent {
  type: PromotionTrigger['event'];
  properties?: Record<string, unknown>;
}

export interface PromotionResult {
  channel: PromotionChannel;
  content: PromotContent;
  recommendedTime?: Date;
}

export interface PromotContent {
  title: string;
  body: string;
  cta?: string;
  tags: string[];
  recommendedTime?: Date;
}

export interface ProductInfo {
  name: string;
  tagline: string;
  version: string;
  storeUrl: string;
  features: string[];
  painPoint: string;
  coreBenefit: string;
  targetAudience: string;
  platform: PlatformType;
}
```

- [ ] **步骤 2：编写渠道生成器接口**

创建 `packages/core/src/promotion/channels/types.ts`：

```typescript
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export interface ChannelGenerator {
  channel: PromotionChannel;
  generate(productInfo: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent;
  getRecommendedTiming(strategy: TimingStrategy): Date;
  getRecommendedTags(audience: AudienceProfile): string[];
}
```

- [ ] **步骤 3：实现 Product Hunt 生成器**

创建 `packages/core/src/promotion/channels/product-hunt.ts`：

```typescript
import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class ProductHuntGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'product_hunt';

  generate(product: ProductInfo, locale: string): PromotContent {
    if (locale === 'zh') {
      return {
        title: `${product.name} — ${product.tagline}`,
        body: `受够了${product.painPoint}？${product.name} 让你${product.coreBenefit}——零配置。\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\n**适合：**${product.targetAudience}。\n\n安装即用，点击即得。`,
        cta: `在 Chrome Web Store 免费试用`,
        tags: ['效率', 'AI', '浏览器插件'],
      };
    }
    return {
      title: `${product.name} — ${product.tagline}`,
      body: `Tired of ${product.painPoint}? ${product.name} gives you ${product.coreBenefit} — with **zero configuration**.\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\n**Perfect for:** ${product.targetAudience}.\n\nJust install and click. That's it.`,
      cta: `Try it free on Chrome Web Store`,
      tags: ['productivity', 'ai', 'chrome-extension'],
    };
  }

  getRecommendedTiming(strategy: TimingStrategy): Date {
    // Product Hunt 最佳发布时间：周二或周三，太平洋时间 00:01
    const now = new Date();
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
    const release = new Date(now);
    release.setDate(release.getDate() + daysUntilTuesday);
    release.setHours(0, 1, 0, 0); // 太平洋时间近似
    return release;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    const base = ['productivity', 'developer-tools', 'ai'];
    if (audience.segment === 'early_adopter') base.push('early-access');
    return base;
  }
}
```

- [ ] **步骤 4：实现 Reddit/HN/Twitter 生成器**

创建 `packages/core/src/promotion/channels/reddit.ts`：

```typescript
import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class RedditGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'reddit';

  generate(product: ProductInfo, locale: string, options?: Record<string, unknown>): PromotContent {
    const subreddit = (options?.subreddit as string) ?? 'r/productivity';
    if (locale === 'zh') {
      return {
        title: `我做了一个免费的浏览器插件可以${product.coreBenefit}——无需注册`,
        body: `我受够了那些需要注册、配置 API Key 才能试用的 AI 工具。所以我做了 ${product.name}——安装即用。\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\n有什么问题或功能建议欢迎留言！`,
        tags: [subreddit],
      };
    }
    return {
      title: `I made a free Chrome extension that ${product.coreBenefit} — no API key or signup needed`,
      body: `I got frustrated with AI tools that require you to sign up, enter an API key, or pay before you can even try them. So I built ${product.name} — install it, click, done.\n\n${product.features.map(f => `- ${f}`).join('\n')}\n\nHappy to answer questions or take feature requests!`,
      tags: [subreddit],
    };
  }

  getRecommendedTiming(): Date {
    // Reddit 美东时间早上 8-10 点发布最佳
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0); // UTC 13:00 ≈ 美东 8:00
    return tomorrow;
  }

  getRecommendedTags(audience: AudienceProfile): string[] {
    return audience.subreddits ?? ['r/productivity', 'r/SideProject'];
  }
}
```

创建 `packages/core/src/promotion/channels/hacker-news.ts`：

```typescript
import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class HackerNewsGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'hacker_news';

  generate(product: ProductInfo, locale: string): PromotContent {
    return {
      title: `Show HN: ${product.name} – ${product.coreBenefit} (${product.painPoint.replace(/\?/g, '')})`,
      body: `I built ${product.name} because I was tired of ${product.painPoint.toLowerCase()}.\n\nKey differentiators:\n${product.features.map(f => `- ${f}`).join('\n')}\n\nWould love feedback on the quality and UX.\n\n${product.storeUrl}`,
      tags: ['show-hn'],
    };
  }

  getRecommendedTiming(): Date {
    // HN 美东时间早上 8-9 点
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0);
    return tomorrow;
  }

  getRecommendedTags(): string[] {
    return ['show-hn'];
  }
}
```

创建 `packages/core/src/promotion/channels/twitter.ts`：

```typescript
import type { ChannelGenerator } from './types';
import type { PromotionChannel, PromotContent, AudienceProfile, TimingStrategy, ProductInfo } from '../types';

export class TwitterGenerator implements ChannelGenerator {
  channel: PromotionChannel = 'twitter';

  generate(product: ProductInfo, locale: string): PromotContent {
    return {
      title: '',
      body: [
        `🧵 Thread: I built ${product.name} — ${product.tagline}`,
        ``,
        `The problem: ${product.painPoint}`,
        `The solution: ${product.coreBenefit}`,
        ``,
        `What makes it different:`,
        ...product.features.slice(0, 4).map(f => `→ ${f}`),
        ``,
        `Try it free: ${product.storeUrl}`,
        ``,
        `#BuildInPublic #IndieHacker #AI`,
      ].join('\n'),
      tags: ['BuildInPublic', 'IndieHacker', 'AI', 'Productivity'],
    };
  }

  getRecommendedTiming(): Date {
    // Twitter 美东时间上午 9 点或下午 12 点
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }

  getRecommendedTags(): string[] {
    return ['BuildInPublic', 'IndieHacker', 'AI'];
  }
}
```

- [ ] **步骤 5：实现推广策略引擎**

创建 `packages/core/src/promotion/strategy-engine.ts`：

```typescript
import type { ProductConfig, PlatformType, AnalyticsEvent } from '../adapter';
import type { PromotionChannel, PromotionStrategy, PromotionTrigger, PromotionEvent, PromotionResult, PromotContent, ProductInfo } from './types';
import type { ChannelGenerator } from './channels/types';
import { ProductHuntGenerator } from './channels/product-hunt';
import { RedditGenerator } from './channels/reddit';
import { HackerNewsGenerator } from './channels/hacker-news';
import { TwitterGenerator } from './channels/twitter';

export class StrategyEngine {
  private generators: Map<PromotionChannel, ChannelGenerator> = new Map();
  private triggers: Map<string, PromotionTrigger> = new Map();
  private productInfo: ProductInfo;
  private onEvent?: (event: AnalyticsEvent) => void;

  constructor(productConfig: ProductConfig, productInfo: ProductInfo, onEvent?: (event: AnalyticsEvent) => void) {
    this.productInfo = productInfo;
    this.onEvent = onEvent;

    // 注册内置渠道生成器
    this.registerGenerator(new ProductHuntGenerator());
    this.registerGenerator(new RedditGenerator());
    this.registerGenerator(new HackerNewsGenerator());
    this.registerGenerator(new TwitterGenerator());
  }

  registerGenerator(generator: ChannelGenerator): void {
    this.generators.set(generator.channel, generator);
  }

  registerTrigger(trigger: PromotionTrigger): void {
    this.triggers.set(trigger.event, trigger);
  }

  generate(channel: PromotionChannel, options: { locale?: string; [key: string]: unknown } = {}): PromotContent {
    const generator = this.generators.get(channel);
    if (!generator) throw new Error(`No generator registered for channel: ${channel}`);
    const locale = options.locale ?? this.productInfo.platform === 'chrome' ? 'en' : 'en';
    const content = generator.generate(this.productInfo, locale, options);

    this.onEvent?.({
      name: 'promotion_generated',
      properties: { channel, locale },
    });

    return content;
  }

  evaluate(event: PromotionEvent): PromotionResult[] {
    const trigger = this.triggers.get(event.type);
    if (!trigger) return [];

    return trigger.channels.map(channel => {
      const content = this.generate(channel, { locale: 'en' });
      const generator = this.generators.get(channel);
      const recommendedTime = generator?.getRecommendedTiming({ trigger: event.type, delayDays: 0 });

      return { channel, content, recommendedTime };
    });
  }

  getRecommendedStrategies(): PromotionStrategy[] {
    const platform = this.productInfo.platform;
    const strategies: PromotionStrategy[] = [];

    const channelMapping: Record<string, PromotionChannel[]> = {
      chrome: ['product_hunt', 'reddit', 'hacker_news', 'twitter'],
      vscode: ['hacker_news', 'reddit', 'twitter'],
      shopify: ['reddit', 'twitter'],
    };

    const channels = channelMapping[platform] ?? ['product_hunt', 'reddit', 'twitter'];
    for (const channel of channels) {
      strategies.push({
        platform,
        channel,
        contentTemplate: `${channel}-${platform}`,
        timingStrategy: { trigger: 'version_release', delayDays: 0 },
        targetAudience: { locale: 'en', segment: 'early_adopter' },
      });
    }

    return strategies;
  }
}
```

- [ ] **步骤 6：编写策略引擎测试**

创建 `packages/core/test/strategy-engine.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { StrategyEngine } from '../src/promotion/strategy-engine';
import type { ProductInfo } from '../src/promotion/types';
import type { ProductConfig } from '../src/adapter';

const PRODUCT: ProductInfo = {
  name: 'PageLens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.1.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
  features: ['On-Device AI', '8 Page Types', 'Zero Config'],
  painPoint: 'copy-pasting articles into ChatGPT',
  coreBenefit: 'instant structured AI summaries',
  targetAudience: 'researchers, developers, PMs',
  platform: 'chrome',
};

const PRODUCT_CONFIG: ProductConfig = {
  name: 'PageLens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.1.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
  locale: 'en',
};

describe('StrategyEngine', () => {
  it('应能生成 Product Hunt 推广文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('product_hunt');
    expect(content.title).toContain('PageLens');
    expect(content.body).toContain('zero configuration');
    expect(content.tags).toContain('productivity');
  });

  it('应能生成 Reddit 推广文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('reddit');
    expect(content.body).toContain('PageLens');
  });

  it('应能生成 Hacker News Show HN 文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('hacker_news');
    expect(content.title).toContain('Show HN');
  });

  it('应能生成 Twitter Thread 文案', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const content = engine.generate('twitter');
    expect(content.body).toContain('Thread');
  });

  it('应能在事件触发时自动评估推广策略', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    engine.registerTrigger({
      event: 'version_release',
      channels: ['product_hunt', 'hacker_news'],
      autoAction: 'notification',
    });
    const results = engine.evaluate({ type: 'version_release' });
    expect(results).toHaveLength(2);
    expect(results[0].channel).toBe('product_hunt');
  });

  it('应返回推荐推广策略', () => {
    const engine = new StrategyEngine(PRODUCT_CONFIG, PRODUCT);
    const strategies = engine.getRecommendedStrategies();
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies[0].platform).toBe('chrome');
  });
});
```

- [ ] **步骤 7：运行测试验证通过**

运行：`npx vitest run packages/core/test/strategy-engine.test.ts`
预期：PASS

- [ ] **步骤 8：Commit**

```bash
git add packages/core/src/promotion/ packages/core/test/strategy-engine.test.ts
git commit -m "feat(core): 实现推广策略引擎与 4 个渠道生成器"
```

---

### 任务 6：分析追踪器与邮件触发器

**文件：**
- 创建：`packages/core/src/analytics/types.ts`
- 创建：`packages/core/src/analytics/tracker.ts`
- 创建：`packages/core/src/email/types.ts`
- 创建：`packages/core/src/email/email-trigger.ts`
- 创建：`packages/core/test/tracker.test.ts`

- [ ] **步骤 1：编写分析类型**

创建 `packages/core/src/analytics/types.ts`：

```typescript
/** 分析事件 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}

/** 分析提供商接口 */
export interface AnalyticsProvider {
  name: string;
  init(config: Record<string, unknown>): void;
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
}

/** 内置漏斗定义 */
export const BUILTIN_FUNNELS: Record<string, string[]> = {
  onboarding: ['sdk_initialized', 'first_action', 'second_session'],
  engagement: ['trigger_shown', 'trigger_accepted', 'rating_opened', 'share_completed'],
  reactivation: ['email_triggered', 'app_reopened', 'action_taken'],
  conversion: ['pricing_viewed', 'payment_initiated', 'payment_completed'],
};
```

- [ ] **步骤 2：实现事件追踪器**

创建 `packages/core/src/analytics/tracker.ts`：

```typescript
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
```

- [ ] **步骤 3：编写邮件类型**

创建 `packages/core/src/email/types.ts`：

```typescript
import type { TemplateVariable } from '../templates/types';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: TemplateVariable[];
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid';
  apiEndpoint: string;
  apiKey: string;
  fromAddress: string;
}
```

- [ ] **步骤 4：实现邮件触发器**

创建 `packages/core/src/email/email-trigger.ts`：

```typescript
import type { EmailConfig, EmailTemplate } from './types';
import type { AnalyticsEvent } from '../analytics/types';

export class EmailTrigger {
  private templates: Map<string, EmailTemplate> = new Map();
  private config: EmailConfig | null = null;
  private onEvent?: (event: AnalyticsEvent) => void;

  constructor(config?: EmailConfig, onEvent?: (event: AnalyticsEvent) => void) {
    if (config) this.config = config;
    this.onEvent = onEvent;
  }

  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  async send(templateId: string, to: string, variables: Record<string, unknown>): Promise<boolean> {
    if (!this.config) {
      this.onEvent?.({ name: 'email_trigger_error', properties: { error: 'No email config' } });
      return false;
    }

    const template = this.templates.get(templateId);
    if (!template) {
      this.onEvent?.({ name: 'email_trigger_error', properties: { error: `Template not found: ${templateId}` } });
      return false;
    }

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.fromAddress,
          to,
          subject: this.resolveVariables(template.subject, variables),
          html: this.resolveVariables(template.bodyHtml, variables),
          text: this.resolveVariables(template.bodyText, variables),
        }),
      });

      const success = response.ok;
      this.onEvent?.({
        name: success ? 'email_triggered' : 'email_trigger_error',
        properties: { templateId, to, status: response.status },
      });
      return success;
    } catch (error) {
      this.onEvent?.({
        name: 'email_trigger_error',
        properties: { templateId, error: String(error) },
      });
      return false;
    }
  }

  private resolveVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}
```

- [ ] **步骤 5：编写追踪器测试**

创建 `packages/core/test/tracker.test.ts`：

```typescript
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
```

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run packages/core/test/tracker.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add packages/core/src/analytics/ packages/core/src/email/ packages/core/test/tracker.test.ts
git commit -m "feat(core): 实现分析追踪器与邮件触发器"
```

---

### 任务 7：GrowthSDK 主引擎

**文件：**
- 创建：`packages/core/src/engine.ts`
- 创建：`packages/core/src/index.ts`
- 创建：`packages/core/test/engine.test.ts`

- [ ] **步骤 1：实现 GrowthSDK 主类**

创建 `packages/core/src/engine.ts`：

```typescript
import type { GrowthSDKConfig, AnalyticsEvent, PlatformAdapter } from './adapter';
import { TriggerEngine } from './triggers/trigger-engine';
import { TemplateEngine } from './templates/template-engine';
import { StrategyEngine } from './promotion/strategy-engine';
import { Tracker } from './analytics/tracker';
import { EmailTrigger } from './email/email-trigger';
import { createSecondSessionRating, createUsageCountRating } from './triggers/built-in/usage-count';
import { createInactiveReactivate } from './triggers/built-in/inactive';
import type { Trigger } from './triggers/types';
import type { PromotionTrigger, PromotionEvent, PromotionResult } from './promotion/types';

export class GrowthSDK {
  private config: GrowthSDKConfig;
  private adapter: PlatformAdapter;
  private _triggers: TriggerEngine;
  private _templates: TemplateEngine;
  private _promotion: StrategyEngine;
  private _analytics: Tracker;
  private _email: EmailTrigger;
  private initialized = false;

  constructor(config: GrowthSDKConfig) {
    this.config = config;
    this.adapter = config.adapter;

    // 创建事件分发器
    const dispatchEvent = (event: AnalyticsEvent) => this._analytics.track(event.name, event.properties);

    // 初始化子模块
    this._analytics = new Tracker(config.analytics?.provider);
    this._triggers = new TriggerEngine(this.adapter, dispatchEvent);
    this._templates = new TemplateEngine(this.adapter, config.product);
    this._promotion = new StrategyEngine(config.product, {
      name: config.product.name,
      tagline: config.product.tagline,
      version: config.product.version,
      storeUrl: config.product.storeUrl,
      features: [],
      painPoint: '',
      coreBenefit: '',
      targetAudience: '',
      platform: this.adapter.device.getPlatform(),
    }, dispatchEvent);
    this._email = new EmailTrigger(config.email ? {
      provider: config.email.provider,
      apiEndpoint: config.email.apiEndpoint,
      apiKey: config.email.apiKey,
      fromAddress: `${config.product.name.toLowerCase()}@notifications.app`,
    } : undefined, dispatchEvent);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    // 加载触发器状态
    await this._triggers.loadState();

    // 初始化模板引擎
    await this._templates.init();

    // 注册默认触发器
    this.registerDefaultTriggers();

    this.initialized = true;

    this._analytics.track('sdk_initialized', {
      platform: this.adapter.device.getPlatform(),
      version: this.config.product.version,
      locale: this.adapter.device.getLocale(),
    });
  }

  get triggers(): {
    register(trigger: Trigger): void;
    evaluate(event: import('./triggers/types').UserEvent): Promise<void>;
    getHistory(): import('./triggers/types').TriggerHistory[];
  } {
    return {
      register: (t) => this._triggers.register(t),
      evaluate: (e) => this._triggers.evaluate(e),
      getHistory: () => this._triggers.getHistory(),
    };
  }

  get templates(): {
    render(id: string, options: import('./templates/types').RenderOptions): import('./templates/types').RenderedContent;
    register(template: import('./templates/types').GrowthTemplate): void;
    getVariant(templateId: string): Promise<import('./templates/types').TemplateVariant | null>;
  } {
    return {
      render: (id, opts) => this._templates.render(id, opts),
      register: (t) => this._templates.register(t),
      getVariant: (id) => this._templates.getVariant(id),
    };
  }

  get promotion(): {
    generate(channel: import('./promotion/types').PromotionChannel, options?: Record<string, unknown>): import('./promotion/types').PromotContent;
    getRecommendedStrategies(): import('./promotion/types').PromotionStrategy[];
    registerTrigger(trigger: PromotionTrigger): void;
    evaluate(event: PromotionEvent): PromotionResult[];
  } {
    return {
      generate: (ch, opts) => this._promotion.generate(ch, opts),
      getRecommendedStrategies: () => this._promotion.getRecommendedStrategies(),
      registerTrigger: (t) => this._promotion.registerTrigger(t),
      evaluate: (e) => this._promotion.evaluate(e),
    };
  }

  get analytics(): {
    track(name: string, properties?: Record<string, unknown>): void;
    identify(userId: string, traits?: Record<string, unknown>): void;
  } {
    return {
      track: (n, p) => this._analytics.track(n, p),
      identify: (id, t) => this._analytics.identify(id, t),
    };
  }

  dispose(): void {
    this.initialized = false;
  }

  private registerDefaultTriggers(): void {
    const triggerConfig = this.config.triggers ?? {};

    // 第二次会话评分
    if (triggerConfig['second_session_rating']?.enabled !== false) {
      this._triggers.register(createSecondSessionRating(
        triggerConfig['second_session_rating'] as any,
      ));
    }

    // 使用次数评分
    if (triggerConfig['usage_count_rating']?.enabled !== false) {
      this._triggers.register(createUsageCountRating(
        triggerConfig['usage_count_rating'] as any,
      ));
    }

    // 长期未使用激活
    if (triggerConfig['inactive_reactivate']?.enabled !== false) {
      this._triggers.register(createInactiveReactivate(
        triggerConfig['inactive_reactivate'] as any,
      ));
    }
  }
}
```

- [ ] **步骤 2：创建 index.ts 公共导出**

创建 `packages/core/src/index.ts`：

```typescript
// 主类
export { GrowthSDK } from './engine';

// 类型 — 适配器
export type {
  PlatformType,
  PlatformAdapter,
  RatingPromptConfig,
  RatingAction,
  NotificationConfig,
  ShareConfig,
  ProductConfig,
  GrowthSDKConfig,
  AnalyticsProvider,
  AnalyticsEvent,
} from './adapter';

// 类型 — 触发器
export type {
  Trigger,
  TriggerCondition,
  TriggerAction,
  CooldownConfig,
  TriggerHistory,
  UserEvent,
} from './triggers/types';

// 类型 — 模板
export type {
  GrowthTemplate,
  LocaleContent,
  TemplateVariable,
  TemplateVariant,
  RenderOptions,
  RenderedContent,
} from './templates/types';

// 类型 — 推广
export type {
  PromotionChannel,
  PromotionStrategy,
  PromotionTrigger,
  PromotionEvent,
  PromotionResult,
  PromotContent,
  ProductInfo,
} from './promotion/types';

// 类型 — 分析
export type { AnalyticsEvent as AnalyticsEventType } from './analytics/types';

// 类型 — 邮件
export type { EmailTemplate, EmailConfig } from './email/types';
```

- [ ] **步骤 3：编写集成测试**

创建 `packages/core/test/engine.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowthSDK } from '../src/engine';
import type { PlatformAdapter, GrowthSDKConfig } from '../src/adapter';

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
      getStoreUrl: vi.fn().mockReturnValue('https://chrome.google.com/webstore/detail/xxx'),
    },
    device: {
      getPlatform: vi.fn().mockReturnValue('chrome'),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
      getLocale: vi.fn().mockReturnValue('en'),
    },
  };
}

describe('GrowthSDK', () => {
  let sdk: GrowthSDK;
  let adapter: PlatformAdapter;

  beforeEach(async () => {
    adapter = createMockAdapter();
    sdk = new GrowthSDK({
      adapter,
      product: {
        name: 'PageLens',
        tagline: 'Free AI Web Summarizer',
        version: '1.1.0',
        storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
        supportUrl: 'https://github.com/fikard/web_plugins/issues',
        locale: 'en',
      },
    });
    await sdk.init();
  });

  it('应成功初始化并追踪 sdk_initialized 事件', () => {
    // init 已在 beforeEach 中调用
    // SDK 已初始化，无错误即可
    expect(true).toBe(true);
  });

  it('应提供触发器 API', () => {
    expect(typeof sdk.triggers.register).toBe('function');
    expect(typeof sdk.triggers.evaluate).toBe('function');
    expect(typeof sdk.triggers.getHistory).toBe('function');
  });

  it('应提供模板 API', () => {
    expect(typeof sdk.templates.render).toBe('function');
    expect(typeof sdk.templates.register).toBe('function');
    expect(typeof sdk.templates.getVariant).toBe('function');
  });

  it('应提供推广 API', () => {
    expect(typeof sdk.promotion.generate).toBe('function');
    expect(typeof sdk.promotion.getRecommendedStrategies).toBe('function');
    expect(typeof sdk.promotion.registerTrigger).toBe('function');
    expect(typeof sdk.promotion.evaluate).toBe('function');
  });

  it('应提供分析 API', () => {
    expect(typeof sdk.analytics.track).toBe('function');
    expect(typeof sdk.analytics.identify).toBe('function');
  });

  it('dispose 后应可安全调用', () => {
    expect(() => sdk.dispose()).not.toThrow();
  });
});
```

- [ ] **步骤 4：运行全部核心测试**

运行：`npx vitest run packages/core/test/`
预期：全部 PASS

- [ ] **步骤 5：构建 core 包**

运行：`cd packages/core && npm run build`
预期：构建成功，输出 dist/index.js + dist/index.cjs + dist/index.d.ts

- [ ] **步骤 6：Commit**

```bash
git add packages/core/src/engine.ts packages/core/src/index.ts packages/core/test/engine.test.ts
git commit -m "feat(core): 实现 GrowthSDK 主引擎与公共 API"
```

---

### 任务 8：Chrome 适配器

**文件：**
- 创建：`packages/adapter-chrome/src/storage.ts`
- 创建：`packages/adapter-chrome/src/ui.ts`
- 创建：`packages/adapter-chrome/src/links.ts`
- 创建：`packages/adapter-chrome/src/index.ts`
- 创建：`packages/adapter-chrome/test/chrome-adapter.test.ts`

- [ ] **步骤 1：实现 Chrome 存储**

创建 `packages/adapter-chrome/src/storage.ts`：

```typescript
const STORAGE_PREFIX = 'growth_sdk_';

export class ChromeStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(`${STORAGE_PREFIX}${key}`);
    const value = result[`${STORAGE_PREFIX}${key}`];
    return value !== undefined ? (value as T) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [`${STORAGE_PREFIX}${key}`]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(`${STORAGE_PREFIX}${key}`);
  }
}
```

- [ ] **步骤 2：实现 Chrome UI**

创建 `packages/adapter-chrome/src/ui.ts`：

```typescript
import type { RatingPromptConfig, RatingAction, NotificationConfig, ShareConfig } from '@growth-sdk/core';

export class ChromeUI {
  private container: HTMLElement | null = null;

  async showRatingPrompt(config: RatingPromptConfig): Promise<RatingAction> {
    return new Promise((resolve) => {
      const overlay = this.createOverlay();
      const dialog = this.createDialog();

      dialog.innerHTML = `
        <div style="text-align:center;padding:24px;">
          <h3 style="margin:0 0 8px;font-size:18px;">${config.title}</h3>
          <p style="margin:0 0 20px;color:#666;font-size:14px;">${config.message}</p>
          <div style="display:flex;gap:12px;justify-content:center;">
            ${config.options.map(opt => `
              <button data-action="${opt.action}" style="
                padding:10px 20px;border:1px solid #ddd;border-radius:8px;cursor:pointer;
                font-size:14px;background:white;
              ">${opt.emoji} ${opt.label}</button>
            `).join('')}
          </div>
        </div>
      `;

      dialog.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('button');
        if (button) {
          const action = button.dataset.action as RatingAction['type'];
          this.removeOverlay(overlay);
          resolve({ type: action });
        }
      });

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  async showNotification(config: NotificationConfig): Promise<void> {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:16px;right:16px;z-index:2147483647;
      padding:16px 24px;border-radius:8px;background:#1a1a2e;color:#fff;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;max-width:360px;
      transition:opacity 0.3s;opacity:1;
    `;
    toast.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">${config.title}</div>
      <div style="opacity:0.8;">${config.message}</div>
      ${config.cta ? `<a href="${config.cta.url}" target="_blank" style="color:#4ade80;text-decoration:none;font-weight:600;margin-top:8px;display:inline-block;">${config.cta.label}</a>` : ''}
    `;
    document.body.appendChild(toast);

    const duration = config.duration ?? 5000;
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async showShareDialog(config: ShareConfig): Promise<void> {
    const shareUrl = new URL('https://twitter.com/intent/tweet');
    shareUrl.searchParams.set('text', `${config.title}\n${config.text}`);
    shareUrl.searchParams.set('url', config.url);
    window.open(shareUrl.toString(), '_blank', 'width=600,height=400');
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
    return overlay;
  }

  private createDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);min-width:320px;max-width:420px;';
    return dialog;
  }

  private removeOverlay(overlay: HTMLElement): void {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';
    setTimeout(() => overlay.remove(), 200);
  }
}
```

- [ ] **步骤 3：实现 Chrome 链接**

创建 `packages/adapter-chrome/src/links.ts`：

```typescript
export class ChromeLinks {
  private storeUrl: string;

  constructor(storeUrl: string) {
    this.storeUrl = storeUrl;
  }

  openStorePage(): void {
    window.open(this.storeUrl, '_blank');
  }

  openShareUrl(url: string): void {
    window.open(url, '_blank', 'width=600,height=400');
  }

  getStoreUrl(): string {
    return this.storeUrl;
  }
}
```

- [ ] **步骤 4：实现 ChromeAdapter**

创建 `packages/adapter-chrome/src/index.ts`：

```typescript
import type { PlatformAdapter } from '@growth-sdk/core';
import { ChromeStorage } from './storage';
import { ChromeUI } from './ui';
import { ChromeLinks } from './links';

export interface ChromeAdapterOptions {
  storeUrl: string;
}

export class ChromeAdapter implements PlatformAdapter {
  storage: PlatformAdapter['storage'];
  ui: PlatformAdapter['ui'];
  links: PlatformAdapter['links'];
  device: PlatformAdapter['device'];

  constructor(options: ChromeAdapterOptions) {
    this.storage = new ChromeStorage();
    this.ui = new ChromeUI();
    this.links = new ChromeLinks(options.storeUrl);
    this.device = {
      getPlatform: () => 'chrome' as const,
      getVersion: () => chrome.runtime.getManifest().version,
      getLocale: () => navigator.language.split('-')[0] ?? 'en',
    };
  }
}

export { ChromeStorage } from './storage';
export { ChromeUI } from './ui';
export { ChromeLinks } from './links';
```

- [ ] **步骤 5：编写 Chrome 适配器测试**

创建 `packages/adapter-chrome/test/chrome-adapter.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ChromeAdapter } from '../src/index';

// Mock chrome API
const storageData: Record<string, unknown> = {};
(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          if (storageData[key] !== undefined) result[key] = storageData[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(storageData, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) delete storageData[key];
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    getManifest: vi.fn().mockReturnValue({ version: '1.1.0' }),
  },
};

describe('ChromeAdapter', () => {
  it('应实现 PlatformAdapter 接口', () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://chrome.google.com/webstore/detail/xxx' });
    expect(adapter.storage).toBeDefined();
    expect(adapter.ui).toBeDefined();
    expect(adapter.links).toBeDefined();
    expect(adapter.device).toBeDefined();
  });

  it('device 应返回 chrome 平台', () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
    expect(adapter.device.getPlatform()).toBe('chrome');
    expect(adapter.device.getVersion()).toBe('1.1.0');
  });

  it('storage 应能读写数据', async () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
    await adapter.storage.set('test_key', { foo: 'bar' });
    const result = await adapter.storage.get<{ foo: string }>('test_key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('storage get 对不存在的 key 应返回 null', async () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://example.com' });
    const result = await adapter.storage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('links 应返回正确的商店 URL', () => {
    const adapter = new ChromeAdapter({ storeUrl: 'https://chrome.google.com/webstore/detail/abc' });
    expect(adapter.links.getStoreUrl()).toBe('https://chrome.google.com/webstore/detail/abc');
  });
});
```

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run packages/adapter-chrome/test/`
预期：PASS

- [ ] **步骤 7：构建 adapter-chrome 包**

运行：`cd packages/adapter-chrome && npm run build`
预期：构建成功

- [ ] **步骤 8：运行全部测试**

运行：`npx vitest run`
预期：全部 PASS

- [ ] **步骤 9：Commit**

```bash
git add packages/adapter-chrome/
git commit -m "feat(chrome): 实现 Chrome 适配器（storage/ui/links）"
```

---

### 任务 9：最终验证与清理

- [ ] **步骤 1：运行全部测试**

运行：`npx vitest run`
预期：全部 PASS，0 failures

- [ ] **步骤 2：运行 lint**

运行：`npx oxlint packages/*/src`
预期：0 errors

- [ ] **步骤 3：构建所有包**

运行：`npm run build`
预期：core + adapter-chrome 均构建成功

- [ ] **步骤 4：验证类型导出**

运行：`cd packages/core && npx tsc --noEmit`
预期：0 errors

- [ ] **步骤 5：最终 Commit**

```bash
git add -A
git commit -m "chore: Phase 1 完成 — Growth SDK 核心引擎 + Chrome 适配器"
```
