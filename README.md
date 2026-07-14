# Growth SDK

多平台插件增长获客 SDK — 为 Chrome / VSCode / Shopify / Figma / WordPress / Notion 等插件提供统一的用户行为触发、文案模板管理、自动化推广和数据追踪能力。

## 架构

采用**平台无关核心 + 平台适配器**模式：增长策略逻辑写一次，全平台复用；新平台只需实现适配器接口。

```
┌─────────────────────────────────────────────────┐
│                  Plugin Project                  │
│  ┌─────────────┐  ┌───────────────────────────┐ │
│  │ @growth-sdk │  │ @growth-sdk/adapter-chrome │ │
│  │    core     │◄─┤  (or adapter-vscode/...)   │ │
│  └──────┬──────┘  └───────────────────────────┘ ││
│         │                                         │
│  ┌──────┴──────────────────────────────────┐     │
│  │              Core Modules                │     │
│  │  Triggers │ Templates │ Promotion       │     │
│  │  Analytics │ Email                       │     │
│  └─────────────────────────────────────────┘     │
│         │                                         │
│  ┌──────┴──────────────────────────────────┐     │
│  │       Platform Adapter Interface         │     │
│  │  storage │ ui │ links │ device           │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
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

## API 参考

### `sdk.triggers` — 触发器管理

```typescript
// 注册自定义触发器
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

// 手动触发评估
await sdk.triggers.evaluate({ type: 'milestone_reached', properties: { milestoneType: '100_summaries' } });

// 获取触发历史
const history = sdk.triggers.getHistory();
```

### 内置触发器

| 触发器 ID | 触发条件 | 默认动作 |
|-----------|---------|---------|
| `second_session_rating` | 第 2 次打开 | 弹出评分请求 |
| `usage_count_rating` | 累计使用 5 次 | 弹出评分请求 |
| `inactive_reactivate` | 14 天未使用 | 发送激活邮件 |

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
// 生成推广文案
const phContent = sdk.promotion.generate('product_hunt');
const redditContent = sdk.promotion.generate('reddit', { subreddit: 'r/productivity' });
const hnContent = sdk.promotion.generate('hacker_news');
const twitterContent = sdk.promotion.generate('twitter');

// 注册自动化推广触发
sdk.promotion.registerTrigger({
  event: 'version_release',
  channels: ['product_hunt', 'hacker_news', 'twitter'],
  autoAction: 'notification',
});

// 获取推荐推广策略
const strategies = sdk.promotion.getRecommendedStrategies();
```

支持的推广渠道：`product_hunt` | `reddit` | `hacker_news` | `twitter` | `indie_hackers` | `seo`

### `sdk.analytics` — 事件追踪

```typescript
// 追踪自定义事件
sdk.analytics.track('summary_created', { pageType: 'github', durationMs: 2300 });

// 设置用户标识
sdk.analytics.identify('user-123', { plan: 'free', installDate: '2026-07-14' });
```

### 自动追踪的事件

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

## 开发

```bash
# 安装依赖
npm install

# 运行测试
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
│   ├── core/                    # @growth-sdk/core
│   │   ├── src/
│   │   │   ├── engine.ts        # GrowthSDK 主类
│   │   │   ├── adapter.ts       # PlatformAdapter 接口 + 共享类型
│   │   │   ├── triggers/        # 触发器引擎 + 内置触发器
│   │   │   ├── templates/       # 模板引擎 + 变量解析 + A/B 测试
│   │   │   ├── promotion/       # 推广策略引擎 + 渠道生成器
│   │   │   ├── analytics/       # 事件追踪器
│   │   │   └── email/           # 邮件触发器
│   │   └── test/
│   └── adapter-chrome/          # @growth-sdk/adapter-chrome
│       ├── src/
│       │   ├── storage.ts       # chrome.storage.local
│       │   ├── ui.ts            # 弹窗/通知/分享
│       │   └── links.ts         # Web Store 链接
│       └── test/
├── docs/
│   └── superpowers/
│       ├── specs/               # 设计规格文档
│       └── plans/               # 实现计划文档
└── 推广获客.md                  # 推广渠道参考资料
```

## License

Private — 内部项目使用
