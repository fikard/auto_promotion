# Growth SDK 设计规格

> **版本**: v1.0
> **日期**: 2026-07-14
> **目标**: 为 Chrome/VSCode/Shopify/Figma/WordPress/Notion 等多平台插件提供统一的增长获客 SDK
> **代码位置**: `/Users/fikard/Desktop/self_project/opc/auto_promotion/`
> **目标仓库**: `https://github.com/fikard/web_plugins.git`

---

## 1. 架构概述

### 1.1 架构决策

- **架构模式**: 平台无关核心 + 平台适配器（方案 A）
- **SDK 形态**: 纯前端 npm 包，各插件项目 import 后使用
- **数据分析**: 第三方分析工具（Plausible/Umami/GA）
- **邮件系统**: SDK 触发 + 第三方邮件服务（Resend/SendGrid）
- **代码位置**: auto_promotion 目录下独立项目

### 1.2 核心架构图

```
┌──────────────────────────────────────────────────────┐
│                    Plugin Project                     │
│  ┌───────────────┐  ┌──────────────────────────────┐ │
│  │  @growth-sdk/ │  │  @growth-sdk/adapter-chrome   │ │
│  │     core      │◄─┤  (or adapter-vscode/...)      │ │
│  └───────┬───────┘  └──────────────────────────────┘ │
│          │                                            │
│  ┌───────┴──────────────────────────────────────┐    │
│  │              Core Modules                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │    │
│  │  │ Triggers │ │Templates │ │  Promotion   │  │    │
│  │  │  Engine  │ │  Engine  │ │   Engine     │  │    │
│  │  └──────────┘ └──────────┘ └──────────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐                    │    │
│  │  │Analytics │ │  Email   │                    │    │
│  │  │ Tracker  │ │ Trigger  │                    │    │
│  │  └──────────┘ └──────────┘                    │    │
│  └───────────────────────────────────────────────┘    │
│          │                                            │
│          ▼                                            │
│  ┌───────────────────────────────────────────────┐    │
│  │        Platform Adapter Interface             │    │
│  │  storage │ showUI │ openLink │ getDeviceInfo │    │
│  └───────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## 2. 项目结构

```
auto_promotion/
├── packages/
│   ├── core/                    # @growth-sdk/core
│   │   ├── src/
│   │   │   ├── engine.ts        # 主引擎：初始化、调度
│   │   │   ├── triggers/
│   │   │   │   ├── trigger-engine.ts    # 触发器引擎
│   │   │   │   ├── built-in/
│   │   │   │   │   ├── usage-count.ts   # 使用次数触发
│   │   │   │   │   ├── inactive.ts      # 长期未使用触发
│   │   │   │   │   ├── feature-complete.ts  # 功能完成触发
│   │   │   │   │   └── payment.ts       # 付费转化触发
│   │   │   │   └── types.ts
│   │   │   ├── templates/
│   │   │   │   ├── template-engine.ts   # 模板渲染引擎
│   │   │   │   ├── variable-resolver.ts # 变量解析
│   │   │   │   ├── ab-test.ts           # A/B 测试分配
│   │   │   │   └── types.ts
│   │   │   ├── promotion/
│   │   │   │   ├── strategy-engine.ts   # 推广策略引擎
│   │   │   │   ├── channels/
│   │   │   │   │   ├── product-hunt.ts
│   │   │   │   │   ├── reddit.ts
│   │   │   │   │   ├── hacker-news.ts
│   │   │   │   │   ├── twitter.ts
│   │   │   │   │   ├── indie-hackers.ts
│   │   │   │   │   └── types.ts
│   │   │   │   └── types.ts
│   │   │   ├── analytics/
│   │   │   │   ├── tracker.ts           # 事件追踪器
│   │   │   │   ├── providers/
│   │   │   │   │   ├── plausible.ts
│   │   │   │   │   ├── umami.ts
│   │   │   │   │   └── types.ts
│   │   │   │   └── types.ts
│   │   │   ├── email/
│   │   │   │   ├── email-trigger.ts     # 邮件触发接口
│   │   │   │   ├── providers/
│   │   │   │   │   ├── resend.ts
│   │   │   │   │   └── types.ts
│   │   │   │   └── types.ts
│   │   │   ├── adapter.ts              # 平台适配器接口定义
│   │   │   └── index.ts
│   │   └── package.json
│   ├── adapter-chrome/           # @growth-sdk/adapter-chrome
│   │   ├── src/
│   │   │   ├── storage.ts        # chrome.storage.local 封装
│   │   │   ├── ui.ts             # 弹窗/通知 UI 渲染
│   │   │   ├── links.ts          # Web Store / 分享链接
│   │   │   └── index.ts
│   │   └── package.json
│   ├── adapter-vscode/           # @growth-sdk/adapter-vscode
│   │   ├── src/
│   │   │   ├── storage.ts        # GlobalState / WorkspaceState
│   │   │   ├── ui.ts             # Webview / Notification
│   │   │   ├── links.ts          # Marketplace 链接
│   │   │   └── index.ts
│   │   └── package.json
│   ├── adapter-shopify/          # @growth-sdk/adapter-shopify
│   │   ├── src/
│   │   │   ├── storage.ts        # Shopify App Bridge Storage
│   │   │   ├── ui.ts             # App Bridge Toast / Modal
│   │   │   ├── links.ts          # Shopify App Store 链接
│   │   │   └── index.ts
│   │   └── package.json
│   └── adapter-web/              # @growth-sdk/adapter-web（通用 Web 平台）
│       ├── src/
│       │   ├── storage.ts        # localStorage / IndexedDB
│       │   ├── ui.ts             # DOM 弹窗/通知
│       │   ├── links.ts          # 通用链接
│       │   └── index.ts
│       └── package.json
├── package.json                  # monorepo root
├── tsconfig.json
└── README.md
```

---

## 3. 平台适配器接口

平台适配器是 SDK 的核心契约，所有适配器必须实现以下接口：

```typescript
type PlatformType = 'chrome' | 'vscode' | 'shopify' | 'figma' | 'wordpress' | 'notion' | 'web';

interface PlatformAdapter {
  /** 持久化存储（读/写/删） */
  storage: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
  };
  /** UI 展示（弹窗、通知、评分请求等） */
  ui: {
    showRatingPrompt(config: RatingPromptConfig): Promise<RatingAction>;
    showNotification(config: NotificationConfig): Promise<void>;
    showShareDialog(config: ShareConfig): Promise<void>;
  };
  /** 链接跳转（商店页面、分享链接等） */
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

interface RatingPromptConfig {
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

type RatingAction = { type: 'open_store' | 'show_feedback' | 'dismiss' };

interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'celebration';
  cta?: { label: string; url: string };
  duration?: number;
}

interface ShareConfig {
  title: string;
  text: string;
  url: string;
  channels?: string[];
}
```

---

## 4. 平台适配与推广策略

### 4.1 各平台推广策略矩阵

| 维度 | Chrome 插件 | VSCode 扩展 | Shopify 应用 | Figma/WordPress/Notion |
|------|------------|-------------|-------------|----------------------|
| **商店 ASO** | Chrome Web Store 关键词优化 | VSCode Marketplace 关键词+图标 | Shopify App Store 分类+评分 | 各平台商店优化 |
| **核心推广渠道** | Product Hunt, Reddit, HN, Twitter | Dev.to, Reddit r/vscode, HN | Shopify Community, Reddit r/shopify | 平台专属社区 |
| **内容形式** | Demo 视频 + 截图 | GIF 演示 + 技术博客 | 案例研究 + 教程视频 | 模板 + 教程 |
| **投放时机** | v1.0 发布日集中投放 | 版本更新时在 Changelog 推广 | 商店审核通过后立即推广 | 功能上线同步推广 |
| **评分请求** | 使用 5 次后弹窗 → Web Store | 命令执行 3 次后 → Marketplace | 店铺运营 7 天后 → App Store | 使用 5 次后 → 平台商店 |
| **分享机制** | 摘要水印 + Twitter 分享 | 代码片段水印 + 链接分享 | 店主口碑 + 店铺展示 | 创作内容水印 |

### 4.2 PR 内容生成机制

```typescript
interface PromotionStrategy {
  platform: PlatformType;
  channel: PromotionChannel;
  contentTemplate: string;       // 模板 ID
  timingStrategy: TimingStrategy;
  targetAudience: AudienceProfile;
}

type PromotionChannel = 'product_hunt' | 'reddit' | 'hacker_news' | 'twitter' | 'indie_hackers' | 'seo';

interface TimingStrategy {
  trigger: 'version_release' | 'milestone' | 'manual';
  delayDays: number;
  milestone?: string;
}

interface AudienceProfile {
  locale: string;
  segment: string;
  subreddits?: string[];
}

interface ChannelGenerator {
  channel: PromotionChannel;
  generate(productInfo: ProductInfo, locale: string): PromotContent;
  getRecommendedTiming(strategy: TimingStrategy): Date;
  getRecommendedTags(audience: AudienceProfile): string[];
}

interface PromotContent {
  title: string;
  body: string;
  cta?: string;
  tags: string[];
  recommendedTime?: Date;
}

interface ProductInfo {
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

### 4.3 内置推广渠道生成器

| 渠道 | 生成器 | 输出格式 |
|------|--------|---------|
| Product Hunt | `ProductHuntGenerator` | Title + Tagline + Description + Maker Comment |
| Reddit | `RedditGenerator` | Title + Body（适配不同 sub 风格） |
| Hacker News | `HackerNewsGenerator` | Show HN Title + Comment Body |
| Twitter/X | `TwitterGenerator` | Tweet Thread（280 字/条，含 hashtag） |
| Indie Hackers | `IndieHackersGenerator` | Post Title + Body + Tags |
| SEO | `SEOGenerator` | Meta Title + Description + Keywords + Blog Outline |

### 4.4 自动化推广触发机制

推广内容生成支持**关键事件自动触发**，与触发器引擎联动，在关键节点自动生成推广内容并通过开发者通知推送。

#### 触发流程

```
关键事件（版本发布/里程碑/增长停滞）
          ↓
  PromotionEngine.evaluate(event)
          ↓
  匹配推广策略（内置策略库）
          ↓
  ┌─────────────────────────────────┐
  │ 自动生成推广内容 + 推荐投放时机  │
  │ → 展示给开发者（非用户）         │
  │ → 可选：自动复制到剪贴板/打开页面│
  └─────────────────────────────────┘
```

#### 自动触发场景

| 触发事件 | 自动生成的推广内容 | 推荐操作 |
|---------|------------------|---------|
| `version_release` (v1.0 发布) | Product Hunt 发布稿 + Reddit 帖子 + HN Show HN | 提示开发者"今天适合集中投放" |
| `milestone:100_installs` | Reddit 成就帖 + Twitter 分享推文 | 自动生成分享文案 |
| `growth_stagnation` (安装量连续 7 天无增长) | 社区重新推广建议 + SEO 博客大纲 | 提示"增长放缓，建议重新推广" |
| `first_rating_received` (收到首个 5 星评价) | Twitter 感谢推文模板 | 引导分享好评 |
| `feature_release` (新功能上线) | 更新日志 + 商店描述更新建议 | 提示更新 ASO 文案 |

#### 推广触发器类型定义

```typescript
interface PromotionTrigger {
  event: 'version_release' | 'milestone' | 'growth_stagnation' | 'first_rating' | 'feature_release';
  channels: PromotionChannel[];     // 自动生成哪些渠道的内容
  autoAction?: 'clipboard' | 'open_page' | 'notification';
}

// 推广触发器与 TriggerEngine 联动：
// 1. TriggerEngine 检测到关键事件
// 2. PromotionEngine.evaluate(event) 匹配策略
// 3. 自动生成内容 + 通过适配器展示通知给开发者
// 4. 开发者确认后执行（复制/打开页面/稍后提醒）
```

#### 使用示例

```typescript
// 注册推广触发器
sdk.promotion.registerTrigger({
  event: 'version_release',
  channels: ['product_hunt', 'reddit', 'hacker_news', 'twitter'],
  autoAction: 'notification',  // 弹通知提示开发者
});

// 当检测到版本更新时，SDK 自动：
// 1. 生成 4 个渠道的推广文案
// 2. 通过 adapter.ui.showNotification() 提示开发者
// 3. 开发者点击通知 → 查看文案 → 一键复制/打开页面

// 手动方式仍然可用
const phContent = sdk.promotion.generate('product_hunt', { locale: 'en' });
```

---

## 5. 用户行为触发机制

### 5.1 触发器引擎架构

```
用户行为事件 → TriggerEngine.evaluate() → 匹配触发器 → 执行动作
                                                  ↓
                                          记录触发历史（防重复）
                                                  ↓
                                          上报分析数据
```

### 5.2 内置触发器

| 触发器 ID | 触发条件 | 默认动作 | 可配置项 |
|-----------|---------|---------|---------|
| `second_session_rating` | 第 2 次打开插件 | 弹出评分请求 | `session`（默认 2）、`delay_ms`（默认 3000） |
| `usage_count_rating` | 累计使用 N 次 | 弹出评分请求 | `count`（默认 5）、`cooldown_days`（默认 90） |
| `inactive_reactivate` | N 天未使用 | 触发邮件/通知 | `threshold_days`（默认 14）、`email_template` |
| `feature_complete_share` | 完成某功能 | 弹出分享邀请 | `feature_id`、`share_channels` |
| `payment_thank_you` | 完成付费 | 感谢+推荐好友 | `referral_bonus`、`share_link` |
| `milestone_celebrate` | 达到里程碑 | 庆祝+分享 | `milestone_type`（如 100th_summary） |

### 5.3 核心类型定义

```typescript
interface TriggerCondition {
  type: 'usage_count' | 'days_inactive' | 'feature_complete' | 'payment' | 'milestone' | 'custom';
  params: Record<string, unknown>;
}

interface TriggerAction {
  type: 'show_rating' | 'show_share' | 'show_notification' | 'send_email' | 'custom';
  config: Record<string, unknown>;
}

interface Trigger {
  id: string;
  name: string;
  condition: TriggerCondition;
  actions: TriggerAction[];
  cooldown: CooldownConfig;
  enabled: boolean;
}

interface CooldownConfig {
  minDaysBetween: number;
  maxTriggers: number;
  dailyLimit: number;
}
```

### 5.4 第二次使用评分弹窗

```typescript
sdk.triggers.register({
  id: 'second_session_rating',
  name: '第二次使用评分请求',
  condition: {
    type: 'usage_count',
    params: { sessionCount: 2 },
  },
  actions: [
    {
      type: 'show_rating',
      config: {
        delayMs: 3000,
        title: 'Enjoying {productName}?',
        message: 'A review helps others discover {productName}. It only takes 30 seconds!',
        ratingOptions: [
          { emoji: '😊', label: 'Love it!', action: 'open_store' },
          { emoji: '😐', label: 'It\'s okay', action: 'show_feedback' },
        ],
        storeUrl: '{storeUrl}',
        feedbackUrl: '{supportUrl}',
      },
    },
  ],
  cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
});
```

评分弹窗 UI 流程：

```
第 2 次打开 → 3 秒延迟 → 弹窗展示
  ├── "Love it!" → 打开商店评分页 + 记录事件(rating_positive)
  └── "It's okay" → 显示反馈表单 + 记录事件(rating_neutral)
```

### 5.5 长期未使用激活系统

```typescript
sdk.triggers.register({
  id: 'inactive_reactivate',
  name: '长期未使用激活提醒',
  condition: {
    type: 'days_inactive',
    params: { thresholdDays: 14 },
  },
  actions: [
    {
      type: 'send_email',
      config: {
        templateId: 'reactivation_d1',
        emailService: 'resend',
        apiEndpoint: 'https://api.resend.com/emails',
      },
    },
  ],
  cooldown: { minDaysBetween: 7, maxTriggers: 3, dailyLimit: 1 },
});
```

多阶段邮件序列：
- D+14: 温馨提醒 "We miss you" → template: `reactivation_d1`
- D+21: 新功能亮点 "Here's what's new" → template: `reactivation_d2`
- D+30: 最后机会 + 优惠（如有）→ template: `reactivation_d3`

### 5.6 邮件模板管理

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;           // 支持 {productName} 等变量
  bodyHtml: string;          // HTML 模板，支持变量
  bodyText: string;          // 纯文本回退
  variables: TemplateVariable[];
}
```

### 5.7 触发器事件记录

```typescript
interface TriggerEvent {
  triggerId: string;
  action: 'shown' | 'accepted' | 'dismissed' | 'error';
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

---

## 6. 文案与内容模板体系

### 6.1 模板引擎架构

```
模板定义 (JSON/TS) → 变量注入 → 语言选择 → A/B 分配 → 渲染输出
```

### 6.2 模板类型

| 模板类型 | 用途 | 示例 |
|---------|------|------|
| **推广文案** | PR 稿、社交媒体帖、商店描述 | Product Hunt 描述、Reddit 帖子 |
| **触发器文案** | 评分弹窗、分享提示、通知 | "Enjoying {productName}?" |
| **邮件文案** | 激活邮件、感谢邮件 | "We miss you, {userName}!" |

### 6.3 模板定义结构

```typescript
interface GrowthTemplate {
  id: string;
  type: 'promotion' | 'trigger' | 'email';
  name: string;
  locales: Record<string, LocaleContent>;
  variables: TemplateVariable[];
  variants?: TemplateVariant[];
  platforms: PlatformType[];
  channel?: PromotionChannel;
}

interface LocaleContent {
  title?: string;
  body: string;
  subject?: string;       // 邮件专用
  cta?: string;           // 行动号召
  tags?: string[];        // 社交标签
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  defaultValue?: unknown;
  source: 'product' | 'user' | 'custom';
}

interface TemplateVariant {
  id: string;
  name: string;
  weight: number;         // 流量权重百分比
  content: LocaleContent;
}
```

### 6.4 模板使用 API

```typescript
// 渲染模板
const content = sdk.templates.render('ph-launch', {
  locale: 'en',
  variables: {
    painPoint: 'copy-pasting articles into ChatGPT',
    coreBenefit: 'instant structured AI summaries',
    featureList: '- On-Device AI\n- 8 Page Types\n- Zero Config',
    targetAudience: 'researchers, developers, PMs',
  },
});

// 获取 A/B 测试变体
const variant = sdk.templates.getVariant('ph-launch');

// 注册自定义模板
sdk.templates.register({ /* GrowthTemplate */ });
```

### 6.5 A/B 测试机制

```
模板请求 → getVariant() → 检查用户已有分组 → 返回分配的变体
                                   ↓ (首次)
                           按权重随机分配 → 持久化到 storage
                                   ↓
                           上报 ab_test_assigned 事件
```

- 用户分组信息通过适配器 storage 持久化
- A/B 测试结果通过 `ab_test_shown` / `ab_test_converted` 事件追踪
- 支持手动强制指定变体（调试用）

### 6.6 多语言策略

语言解析优先级：
1. 调用时显式指定 locale
2. 用户设置中的 locale（通过 `adapter.device.getLocale()`）
3. 浏览器/平台语言（`navigator.language`）
4. 回退到 `'en'`

模板内容回退链：指定语言 → `'en'` → 报错

---

## 7. 数据统计与效果分析

### 7.1 分析提供商接口

```typescript
interface AnalyticsProvider {
  name: string;
  init(config: Record<string, unknown>): void;
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page?(path: string): void;
}

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}
```

### 7.2 内置事件体系

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `sdk_initialized` | SDK 初始化 | platform, version, locale |
| `trigger_shown` | 触发器 UI 展示 | triggerId, variantId |
| `trigger_accepted` | 用户接受触发动作 | triggerId, actionType |
| `trigger_dismissed` | 用户关闭触发 UI | triggerId, dismissMethod |
| `rating_opened` | 打开商店评分页 | triggerId, rating |
| `share_initiated` | 发起分享 | channel, contentType |
| `share_completed` | 分享成功 | channel, contentType |
| `email_triggered` | 邮件触发 | templateId, emailType |
| `ab_test_assigned` | A/B 测试分组 | templateId, variantId |
| `promotion_generated` | PR 文案生成 | channel, locale |

### 7.3 手动埋点 API

```typescript
sdk.analytics.track('summary_created', {
  pageType: 'github',
  engine: 'builtin_ai',
  durationMs: 2300,
});

sdk.analytics.identify('user-123', {
  plan: 'free',
  installDate: '2026-07-14',
  totalSummaries: 42,
});
```

### 7.4 支持的分析工具

| 工具 | 包 | 特点 |
|------|-----|------|
| Plausible | `@growth-sdk/analytics-plausible` | 隐私友好、无需 Cookie 同意 |
| Umami | `@growth-sdk/analytics-umami` | 开源自托管、GDPR 合规 |
| Google Analytics | `@growth-sdk/analytics-ga` | 生态最广 |

### 7.5 转化漏斗

```
安装 → 激活(首次使用) → 留存(第2次使用) → 评分 → 分享 → 付费
 │         │                  │            │       │      │
 └─ install_rate ─┘          └─ retention ┘  └─ rating_rate ┘
                                                    └─ share_rate ┘
                                                          └─ conversion_rate ┘
```

内置漏斗定义：

```typescript
const BUILTIN_FUNNELS = {
  onboarding: ['sdk_initialized', 'first_action', 'second_session'],
  engagement: ['trigger_shown', 'trigger_accepted', 'rating_opened', 'share_completed'],
  reactivation: ['email_triggered', 'app_reopened', 'action_taken'],
  conversion: ['pricing_viewed', 'payment_initiated', 'payment_completed'],
};
```

### 7.6 数据导出

```typescript
const events = await sdk.analytics.export({ startDate: '2026-07-01', endDate: '2026-07-14' });
```

---

## 8. SDK 集成方案

### 8.1 初始化与配置

```typescript
import { GrowthSDK } from '@growth-sdk/core';
import { ChromeAdapter } from '@growth-sdk/adapter-chrome';
import { PlausibleProvider } from '@growth-sdk/analytics-plausible';

const sdk = new GrowthSDK({
  adapter: new ChromeAdapter(),
  product: {
    name: 'PageLens',
    tagline: 'Free AI Web Summarizer with On-Device AI',
    version: '1.1.0',
    storeUrl: 'https://chrome.google.com/webstore/detail/xxx',
    supportUrl: 'https://github.com/fikard/web_plugins/issues',
    locale: 'en',
  },
  analytics: {
    provider: new PlausibleProvider({ domain: 'pagelens.app' }),
  },
  email: {
    provider: 'resend',
    apiEndpoint: 'https://api.resend.com/emails',
    apiKey: import.meta.env.VITE_RESEND_API_KEY,
  },
  triggers: {
    second_session_rating: { enabled: true, session: 2, delayMs: 3000 },
    inactive_reactivate: { enabled: true, thresholdDays: 14 },
    feature_complete_share: { enabled: true },
  },
});

await sdk.init();
```

### 8.2 Chrome 插件集成（PageLens）

```typescript
// src/background/index.ts
import { GrowthSDK } from '@growth-sdk/core';
import { ChromeAdapter } from '@growth-sdk/adapter-chrome';

export const growthSDK = new GrowthSDK({
  adapter: new ChromeAdapter(),
  product: { /* ... */ },
});

chrome.runtime.onInstalled.addListener(async () => {
  await growthSDK.init();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SUMMARIZE_RESULT') {
    growthSDK.analytics.track('summary_created', { pageType: msg.pageType });
  }
});
```

### 8.3 VSCode 扩展集成

```typescript
import { GrowthSDK } from '@growth-sdk/core';
import { VSCodeAdapter } from '@growth-sdk/adapter-vscode';

export async function activate(context: vscode.ExtensionContext) {
  const sdk = new GrowthSDK({
    adapter: new VSCodeAdapter(context),
    product: {
      name: 'MyVSCodeExt',
      tagline: '...',
      storeUrl: 'https://marketplace.visualstudio.com/items?xxx',
      version: context.extension.packageJSON.version,
    },
  });

  await sdk.init();
  context.subscriptions.push({ dispose: () => sdk.dispose() });
}
```

### 8.4 Shopify 应用集成

```typescript
import { GrowthSDK } from '@growth-sdk/core';
import { ShopifyAdapter } from '@growth-sdk/adapter-shopify';

const sdk = new GrowthSDK({
  adapter: new ShopifyAdapter({ app: window.shopifyApp }),
  product: { /* ... */ },
});

await sdk.init();
```

### 8.5 跨平台兼容性保障

| 关注点 | 策略 |
|--------|------|
| **存储** | 适配器抽象，Chrome 用 `chrome.storage`，VSCode 用 `GlobalState`，Shopify 用 `App Bridge Storage`，Web 用 `localStorage` |
| **UI 渲染** | 适配器抽象，Chrome 用 DOM 注入，VSCode 用 Webview，Shopify 用 App Bridge Modal |
| **环境检测** | `adapter.device.getPlatform()` 返回平台标识，core 不做任何环境假设 |
| **构建输出** | core 输出 ESM + CJS 双格式，适配器按平台输出 ESM |
| **TypeScript** | 全量类型导出，严格模式，无 `any` |
| **包体积** | core < 15KB gzip，每个适配器 < 5KB gzip |

### 8.6 SDK API 总览

```typescript
class GrowthSDK {
  init(): Promise<void>;

  triggers: {
    register(trigger: Trigger): void;
    evaluate(event: UserEvent): Promise<void>;
    getHistory(): TriggerHistory[];
  };

  templates: {
    render(id: string, options: RenderOptions): RenderedContent;
    register(template: GrowthTemplate): void;
    getVariant(templateId: string): TemplateVariant;
  };

  promotion: {
    generate(channel: PromotionChannel, options: PromotionOptions): PromotContent;
    getRecommendedStrategies(): PromotionStrategy[];
    registerTrigger(trigger: PromotionTrigger): void;
    evaluate(event: PromotionEvent): PromotionResult[];
  };

  analytics: {
    track(name: string, properties?: Record<string, unknown>): void;
    identify(userId: string, traits?: Record<string, unknown>): void;
    getFunnel(name: string, options?: FunnelOptions): FunnelData;
    export(options: ExportOptions): Promise<AnalyticsEvent[]>;
  };

  dispose(): void;
}
```

---

## 9. 技术栈

| 层面 | 技术 |
|------|------|
| 语言 | TypeScript 6.x（strict mode） |
| 构建 | Vite（库模式） |
| 包管理 | npm workspaces（monorepo） |
| 测试 | Vitest |
| 代码规范 | oxlint |
| 分析工具 | Plausible / Umami / GA（可选集成） |
| 邮件服务 | Resend / SendGrid（可选集成） |

---

## 10. 实现优先级

### Phase 1: 核心 + Chrome 适配器

1. 项目脚手架（monorepo + TypeScript + Vite）
2. 平台适配器接口定义
3. 核心引擎（GrowthSDK 主类）
4. 触发器引擎 + 内置触发器（second_session_rating, usage_count_rating）
5. 模板引擎 + 基础模板
6. Chrome 适配器（storage, ui, links, device）
7. 分析追踪器（Plausible 集成）

### Phase 2: 推广策略 + 邮件

8. 推广策略引擎 + 渠道生成器（Product Hunt, Reddit, HN, Twitter）
9. 邮件触发系统 + Resend 集成
10. A/B 测试模块
11. 多语言模板库

### Phase 3: 更多平台适配器

12. VSCode 适配器
13. Shopify 适配器
14. Web 通用适配器
15. Figma / WordPress / Notion 适配器

### Phase 4: 高级功能

16. 更多分析工具集成（Umami, GA）
17. 更多邮件服务集成（SendGrid）
18. 转化漏斗分析
19. 数据导出功能
