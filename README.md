# Growth SDK

多平台插件增长获客 SDK — 为 Chrome / VSCode / Shopify / Figma / WordPress / Notion 等插件提供统一的用户行为触发、文案模板管理、自动化推广、数据追踪、隐私合规、Feature Flags 和推广归因能力。

## 架构

采用**平台无关核心 + 平台适配器**模式：增长策略逻辑写一次，全平台复用；新平台只需实现适配器接口。

```
┌──────────────────────────────────────────────────────┐
│                    Plugin Project                     │
│  ┌─────────────┐  ┌──────────────────────────────┐   │
│  │ @growth-sdk │  │ @growth-sdk/adapter-chrome   │   │
│  │    core     │◄─┤  (or adapter-vscode/...)     │   │
│  └──────┬──────┘  └──────────────────────────────┘   │
│         │                                              │
│  ┌──────┴───────────────────────────────────────┐     │
│  │                Core Modules                   │     │
│  │  Triggers │ Templates │ Promotion            │     │
│  │  Analytics │ Email │ Privacy │ Feature Flags │     │
│  │  Attribution │ Feedback                       │     │
│  └──────────────────────────────────────────────┘     │
│         │                                              │
│  ┌──────┴───────────────────────────────────────┐     │
│  │         Platform Adapter Interface            │     │
│  │  storage │ ui │ links │ device               │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

## 安装

```bash
# 核心 SDK
npm install @growth-sdk/core

# 平台适配器（按需选择）
npm install @growth-sdk/adapter-chrome
```

## 快速开始

### Chrome 插件

```typescript
import { GrowthSDK } from '@growth-sdk/core';
import { ChromeAdapter } from '@growth-sdk/adapter-chrome';

const sdk = new GrowthSDK({
  adapter: new ChromeAdapter({
    storeUrl: 'https://chrome.google.com/webstore/detail/your-extension-id',
  }),
  product: {
    name: 'PageLens',
    tagline: 'Free AI Web Summarizer with On-Device AI',
    version: '1.1.0',
    storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
    supportUrl: 'https://github.com/you/your-plugin/issues',
    locale: 'en',
  },
  // 可选：接入第三方分析工具
  analytics: {
    provider: yourAnalyticsProvider,
  },
  // 可选：邮件激活系统
  email: {
    provider: 'resend',
    apiEndpoint: 'https://api.resend.com/emails',
    apiKey: import.meta.env.VITE_RESEND_API_KEY,
  },
  // 可选：隐私合规配置
  privacy: {
    defaultConsent: 'unknown',   // 'unknown' | 'granted' | 'denied'
    anonymousMode: false,        // 匿名模式，移除 userId
    sensitiveFields: ['email', 'phone'],  // 自定义脱敏字段
  },
  // 可选：Feature Flags 配置
  featureFlags: {
    remoteConfigUrl: 'https://your-cdn.com/flags.json',
    context: { platform: 'chrome', locale: 'en' },
  },
  // 可选：覆盖默认触发器配置
  triggers: {
    second_session_rating: { enabled: true, session: 2, delayMs: 3000 },
    inactive_reactivate: { enabled: true, thresholdDays: 14 },
  },
});

// 启动 SDK
await sdk.init();
```

### 在 background/service worker 中初始化

```typescript
chrome.runtime.onInstalled.addListener(async () => {
  await sdk.init();
});
```

### 在内容脚本中追踪事件

```typescript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SUMMARIZE_RESULT') {
    sdk.analytics.track('summary_created', { pageType: msg.pageType });
  }
});
```

### 销毁 SDK（持久化状态）

```typescript
// dispose() 会保存触发器状态并刷新分析队列
await sdk.dispose();
```

## API 参考

### `sdk.triggers` — 触发器管理

```typescript
// 注册简单触发器
sdk.triggers.register({
  id: 'custom_100_summaries',
  name: '第 100 次摘要庆祝',
  condition: { type: 'milestone', params: { milestoneType: '100_summaries' } },
  actions: [
    { type: 'show_notification', config: { title: '🎉 100 summaries!', message: 'Share your achievement!' } },
    { type: 'show_share', config: { channels: ['twitter'] } },
  ],
  cooldown: { minDaysBetween: Infinity, maxTriggers: 1, dailyLimit: 1 },
  enabled: true,
});

// 注册组合条件触发器（AND/OR）
sdk.triggers.register({
  id: 'power_user_rating',
  name: '重度用户评分',
  condition: {
    operator: 'and',
    conditions: [
      { type: 'usage_count', params: { sessionCount: 10 } },
      { type: 'custom', params: { eventType: 'payment_completed' } },
    ],
  },
  actions: [
    { type: 'show_rating', config: { title: 'Enjoying it?', message: 'Rate us!' } },
  ],
  cooldown: { minDaysBetween: 30, maxTriggers: 3, dailyLimit: 1 },
  enabled: true,
});

// 手动触发评估
await sdk.triggers.evaluate({ type: 'milestone_reached', properties: { milestoneType: '100_summaries' } });

// 获取触发历史
const history = sdk.triggers.getHistory();
```

#### 内置触发器

| 触发器 ID | 触发条件 | 默认动作 |
|-----------|---------|---------|
| `second_session_rating` | 第 2 次打开 | 弹出评分请求 |
| `usage_count_rating` | 累计使用 5 次 | 弹出评分请求 |
| `inactive_reactivate` | 14 天未使用 | 发送激活邮件 |

#### 触发条件类型

| 条件类型 | 说明 | 示例参数 |
|---------|------|---------|
| `usage_count` | 累计使用次数 | `{ sessionCount: 5 }` |
| `days_inactive` | 不活跃天数 | `{ thresholdDays: 14 }` |
| `feature_complete` | 功能完成 | `{ featureId: 'export' }` |
| `payment` | 付费完成 | — |
| `milestone` | 里程碑 | `{ milestoneType: '100_summaries' }` |
| `custom` | 自定义事件 | `{ eventType: 'my_event' }` |

组合条件支持 `and` / `or` 递归嵌套：

```typescript
condition: {
  operator: 'and',
  conditions: [
    { type: 'usage_count', params: { sessionCount: 10 } },
    {
      operator: 'or',
      conditions: [
        { type: 'payment', params: {} },
        { type: 'milestone', params: { milestoneType: 'pro_feature' } },
      ],
    },
  ],
}
```

### `sdk.templates` — 模板管理

```typescript
// 渲染模板
const content = sdk.templates.render('template-id', {
  locale: 'en',
  variables: { name: 'Alice', productName: 'PageLens' },
});

// 注册自定义模板
sdk.templates.register({
  id: 'my-template',
  type: 'promotion',
  name: 'My Template',
  locales: {
    en: { title: 'Hello {name}!', body: 'Welcome to {productName}.' },
    zh: { title: '你好 {name}！', body: '欢迎来到 {productName}。' },
  },
  variables: [
    { name: 'name', type: 'string', required: true, source: 'custom' },
    { name: 'productName', type: 'string', required: true, source: 'product' },
  ],
  platforms: ['chrome'],
});

// 获取 A/B 测试变体
const variant = await sdk.templates.getVariant('template-id');
```

### `sdk.promotion` — 推广策略

```typescript
// 生成推广文案（自动附带 UTM 参数）
const phContent = sdk.promotion.generate('product_hunt');
console.log(phContent.url); // 带有 utm_source=producthunt&utm_medium=launch 的链接

const redditContent = sdk.promotion.generate('reddit');
const hnContent = sdk.promotion.generate('hacker_news');
const twitterContent = sdk.promotion.generate('twitter');
const discordContent = sdk.promotion.generate('discord');
const linkedinContent = sdk.promotion.generate('linkedin');

// 注册自动化推广触发
sdk.promotion.registerTrigger({
  event: 'version_release',
  channels: ['product_hunt', 'hacker_news', 'twitter', 'discord'],
  autoAction: 'notification',
});

// 获取推荐推广策略（按历史转化率排序）
const strategies = sdk.promotion.getRecommendedStrategies();

// 追踪推广反馈（效果闭环）
await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'viewed' });
await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'clicked' });
await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'converted' });

// 获取各渠道效果统计
const performance = sdk.promotion.getPerformance();
// [{ channel: 'product_hunt', views: 100, clicks: 20, shares: 5, conversions: 3, clickRate: 0.2, conversionRate: 0.15 }, ...]

// 获取推荐渠道排序（按转化率降序）
const recommended = sdk.promotion.getRecommendedChannels();
```

支持的推广渠道：`product_hunt` | `reddit` | `hacker_news` | `twitter` | `indie_hackers` | `seo` | `discord` | `linkedin`

### `sdk.analytics` — 事件追踪

```typescript
// 追踪自定义事件
sdk.analytics.track('summary_created', { pageType: 'github', durationMs: 2300 });

// 设置用户标识
sdk.analytics.identify('user-123', { plan: 'free', installDate: '2026-07-14' });
```

Tracker 内置离线队列：当 provider 不可用时自动缓存事件到持久化存储，恢复后自动回放。支持手动触发队列回放：

```typescript
// 手动刷新队列
await sdk.analytics.flush(); // 通过 sdk._analytics 内部调用
```

#### 自动追踪的事件

| 事件名 | 触发时机 |
|--------|---------|
| `sdk_initialized` | SDK 初始化 |
| `trigger_shown` | 触发器 UI 展示 |
| `trigger_accepted` | 用户接受触发动作 |
| `trigger_dismissed` | 用户关闭触发 UI |
| `rating_opened` | 打开商店评分页 |
| `share_initiated` | 发起分享 |
| `email_triggered` | 邮件触发 |
| `ab_test_assigned` | A/B 测试分组 |
| `promotion_generated` | 推广文案生成 |
| `promotion_viewed` | 推广内容被查看 |
| `promotion_clicked` | 推广链接被点击 |
| `promotion_converted` | 推广带来转化 |
| `attribution_touch` | 归因触点记录 |
| `attribution_conversion` | 归因转化记录 |

### `sdk.privacy` — 隐私合规

```typescript
// 授予/拒绝数据收集同意
sdk.privacy.grant();
sdk.privacy.deny();

// 检查同意状态
sdk.privacy.isGranted(); // boolean

// 开启匿名模式（自动移除所有事件的 userId）
sdk.privacy.setAnonymousMode(true);
```

隐私特性：
- **Consent 管理**：`unknown` → `granted` / `denied`，denied 时不发送任何事件
- **匿名模式**：开启后自动移除 userId
- **自动脱敏**：默认移除 email/phone/ip 等敏感字段，支持自定义字段列表
- **合规状态**：当 consent 为 `unknown` 时仍允许发送事件（可配合 GDPR 弹窗使用）

### `sdk.flags` — Feature Flags

```typescript
// 注册 Feature Flag
sdk.flags.register({
  key: 'new_ui',
  type: 'boolean',
  enabled: true,
  defaultValue: false,
});

// 注册百分比分流 Flag
sdk.flags.register({
  key: 'beta_feature',
  type: 'percentage',
  enabled: true,
  defaultValue: false,
  percentage: 20,  // 20% 用户启用
});

// 注册变体 Flag
sdk.flags.register({
  key: 'onboarding_flow',
  type: 'variant',
  enabled: true,
  defaultValue: 'classic',
  variants: [
    { name: 'classic', weight: 50 },
    { name: 'simplified', weight: 50 },
  ],
});

// 注册带规则的 Flag
sdk.flags.register({
  key: 'advanced_export',
  type: 'boolean',
  enabled: true,
  defaultValue: false,
  rules: [
    { field: 'platform', operator: 'eq', value: 'chrome' },
    { field: 'locale', operator: 'in', value: ['en', 'zh'] },
  ],
});

// 评估 Flag 值
const result = sdk.flags.evaluate('new_ui');
// { key: 'new_ui', value: true, reason: 'default' }

// 批量评估
const allFlags = sdk.flags.evaluateAll();

// 更新运行时上下文
sdk.flags.setContext({ userId: 'user-123', plan: 'pro' });

// 从远程配置加载
await sdk.flags.loadRemoteConfig('https://your-cdn.com/flags.json');
```

Flag 类型与评估规则：

| 类型 | 说明 | 评估逻辑 |
|------|------|---------|
| `boolean` | 开关 | enabled → true |
| `percentage` | 百分比分流 | 基于 userId hash + percentage |
| `variant` | 多变体 | 基于权重分配 |

规则匹配支持：`eq` / `neq` / `in` / `gt` / `lt` / `contains`

### A/B 测试统计引擎

```typescript
import { ExperimentStats } from '@growth-sdk/core';
import type { VariantStats } from '@growth-sdk/core';

const control: VariantStats = { variantId: 'control', samples: 1000, conversions: 100, conversionRate: 0.1 };
const treatment: VariantStats = { variantId: 'treatment', samples: 1000, conversions: 130, conversionRate: 0.13 };

// Z 检验
const { zScore, pValue } = ExperimentStats.zTest(control, treatment);

// 最小样本量计算
const sampleSize = ExperimentStats.minimumSampleSize(
  0.1,    // 基线转化率 10%
  0.3,    // 最小可检测效应 30%（相对提升）
  0.05,   // 显著性水平
  0.8,    // 统计功效
);

// 完整实验分析
const result = ExperimentStats.analyze('my-experiment', [control, treatment]);
// { experimentId, variants, winner, confidence, isSignificant, pValue }
```

### 推广归因追踪

```typescript
import { AttributionTracker } from '@growth-sdk/core';

// 从 URL 解析 UTM 参数
const utm = AttributionTracker.parseUTM('https://example.com?utm_source=reddit&utm_medium=social');
// { utm_source: 'reddit', utm_medium: 'social' }

// 生成带 UTM 的推广 URL
const url = AttributionTracker.buildUTMUrl('https://example.com', {
  utm_source: 'producthunt',
  utm_medium: 'launch',
  utm_campaign: 'v2_launch',
});

// 为渠道自动生成标准 UTM
const channelUTM = AttributionTracker.channelUTM('product_hunt', 'v2_launch');
// { utm_source: 'producthunt', utm_medium: 'launch', utm_campaign: 'v2_launch' }
```

## Chrome 适配器自定义 UI

支持自定义渲染器，替换默认 UI 组件：

```typescript
import { ChromeAdapter } from '@growth-sdk/adapter-chrome';
import type { UIRenderer } from '@growth-sdk/adapter-chrome';

const customRenderer: UIRenderer = {
  renderRatingPrompt(config, container) {
    // 使用你自己的 UI 框架渲染
    return new Promise((resolve) => {
      container.innerHTML = `<my-rating-dialog>...</my-rating-dialog>`;
      // ...
      resolve({ type: 'open_store' });
    });
  },
  renderNotification(config, container) {
    // 自定义通知样式
  },
};

const adapter = new ChromeAdapter({
  storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
  uiRenderer: customRenderer,
});
```

## 新增平台适配器

实现 `PlatformAdapter` 接口即可支持新平台：

```typescript
import type { PlatformAdapter } from '@growth-sdk/core';

export class VSCodeAdapter implements PlatformAdapter {
  storage = {
    async get<T>(key: string): Promise<T | null> { /* 使用 context.globalState */ },
    async set(key: string, value: unknown): Promise<void> { /* ... */ },
    async remove(key: string): Promise<void> { /* ... */ },
  };
  ui = {
    async showRatingPrompt(config) { /* 使用 vscode.window.showInformationMessage */ },
    async showNotification(config) { /* ... */ },
    async showShareDialog(config) { /* ... */ },
  };
  links = {
    openStorePage() { /* 打开 Marketplace 链接 */ },
    openShareUrl(url: string) { /* ... */ },
    getStoreUrl() { return '...'; },
  };
  device = {
    getPlatform: () => 'vscode' as const,
    getVersion: () => extension.packageJSON.version,
    getLocale: () => vscode.env.language,
  };
}
```

## 内置漏斗

```typescript
import { BUILTIN_FUNNELS } from '@growth-sdk/core';

// onboarding: sdk_initialized → first_action → second_session
// engagement: trigger_shown → trigger_accepted → rating_opened → share_completed
// reactivation: email_triggered → app_reopened → action_taken
// conversion: pricing_viewed → payment_initiated → payment_completed
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试（89 个用例）
npm test

# 监听模式
npm run test:watch

# 构建
npm run build

# 代码检查
npm run lint
```

## 项目结构

```
auto_promotion/
├── packages/
│   ├── core/                       # @growth-sdk/core
│   │   ├── src/
│   │   │   ├── engine.ts           # GrowthSDK 主类
│   │   │   ├── adapter.ts          # PlatformAdapter 接口 + 共享类型
│   │   │   ├── triggers/           # 触发器引擎 + 内置触发器
│   │   │   │   ├── trigger-engine.ts
│   │   │   │   ├── types.ts        # 含 CompositeCondition (AND/OR)
│   │   │   │   └── built-in/       # 内置触发器工厂
│   │   │   ├── templates/          # 模板引擎 + 变量解析 + A/B 测试
│   │   │   │   ├── template-engine.ts
│   │   │   │   ├── variable-resolver.ts
│   │   │   │   ├── ab-test.ts
│   │   │   │   └── statistics.ts   # A/B 统计引擎 (Z 检验)
│   │   │   ├── promotion/          # 推广策略引擎 + 渠道生成器
│   │   │   │   ├── strategy-engine.ts
│   │   │   │   ├── attribution.ts  # UTM 归因追踪
│   │   │   │   ├── feedback.ts     # 推广效果反馈闭环
│   │   │   │   └── channels/       # 渠道生成器
│   │   │   │       ├── product-hunt.ts
│   │   │   │       ├── reddit.ts
│   │   │   │       ├── hacker-news.ts
│   │   │   │       ├── twitter.ts
│   │   │   │       ├── discord.ts
│   │   │   │       └── linkedin.ts
│   │   │   ├── analytics/          # 事件追踪 + 隐私合规
│   │   │   │   ├── tracker.ts      # 含离线队列 + 重试
│   │   │   │   ├── consent.ts      # GDPR/隐私合规管理
│   │   │   │   └── types.ts        # 含内置漏斗定义
│   │   │   ├── feature-flags/      # Feature Flags 模块
│   │   │   │   ├── flag-engine.ts
│   │   │   │   └── types.ts
│   │   │   └── email/              # 邮件触发器
│   │   └── test/
│   └── adapter-chrome/             # @growth-sdk/adapter-chrome
│       ├── src/
│       │   ├── storage.ts          # chrome.storage.local
│       │   ├── ui.ts               # 弹窗/通知/分享 (支持自定义渲染器)
│       │   ├── links.ts            # Web Store 链接
│       │   └── index.ts            # ChromeAdapter + UIRenderer 导出
│       └── test/
├── test-integration/               # 集成测试 (47 个用例)
├── docs/
│   └── superpowers/
│       ├── specs/                  # 设计规格文档
│       └── plans/                  # 实现计划文档
└── 推广获客.md                     # 推广渠道参考资料
```

## 技术栈

- TypeScript 6.x (strict)
- Vite (lib mode) + vite-plugin-dts
- Vitest
- npm workspaces (monorepo)

## License

Private — 内部项目使用
