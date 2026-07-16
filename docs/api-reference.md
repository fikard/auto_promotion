# Growth SDK 接口文档

> 版本：0.1.0 | 包名：`@growth-sdk/core`

## 1. 快速开始

### 安装

```bash
# 核心包
npm install @growth-sdk/core

# Chrome 扩展适配器
npm install @growth-sdk/adapter-chrome
```

### 初始化

```typescript
import { GrowthSDK } from '@growth-sdk/core';
import { ChromeAdapter } from '@growth-sdk/adapter-chrome';

const sdk = new GrowthSDK({
  adapter: new ChromeAdapter({ storeUrl: 'https://chromewebstore.google.com/detail/xxx' }),
  product: {
    name: 'MyExtension',
    tagline: 'Boost your productivity',
    version: '1.0.0',
    storeUrl: 'https://chromewebstore.google.com/detail/xxx',
    locale: 'en',
  },
});

await sdk.init();
```

### 最小配置示例

```typescript
import { GrowthSDK } from '@growth-sdk/core';

// 使用自定义适配器（仅展示最小字段）
const sdk = new GrowthSDK({
  adapter: myAdapter,    // 实现 PlatformAdapter 接口
  product: {
    name: 'MyApp',
    tagline: 'Short description',
    version: '1.0.0',
    storeUrl: 'https://example.com/store',
    locale: 'zh',
  },
});

await sdk.init();
// SDK 已就绪，可调用 sdk.triggers / sdk.templates / sdk.promotion 等
```

---

## 2. GrowthSDK 主类

```typescript
import { GrowthSDK } from '@growth-sdk/core';
```

### `constructor(config: GrowthSDKConfig)`

创建 SDK 实例。构造函数中会初始化所有子引擎（触发器、模板、推广、分析、Feature Flags、隐私合规），但**不会**执行异步初始化逻辑。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `config` | `GrowthSDKConfig` | ✅ | SDK 完整配置 |

### `init(): Promise<void>`

异步初始化 SDK。加载触发器持久化状态、模板引擎、Feature Flags 远程配置，并注册内置触发器。**必须在使用其他 API 前调用**。

```typescript
const sdk = new GrowthSDK(config);
await sdk.init();
```

### `dispose(): Promise<void>`

销毁 SDK 实例。持久化触发器状态、刷新分析事件队列，并将 `initialized` 标记为 `false`。

```typescript
await sdk.dispose();
```

### 完整配置项 — `GrowthSDKConfig`

```typescript
interface GrowthSDKConfig {
  /** 平台适配器（必填） */
  adapter: PlatformAdapter;

  /** 产品信息（必填） */
  product: ProductConfig;

  /** 分析提供商配置 */
  analytics?: {
    provider: AnalyticsProvider;
  };

  /** 邮件服务配置 */
  email?: {
    provider: 'resend' | 'sendgrid';
    apiEndpoint: string;
    apiKey: string;
  };

  /** 触发器配置覆盖 */
  triggers?: Record<string, TriggerConfig>;

  /** Feature Flags 配置 */
  featureFlags?: {
    remoteConfigUrl?: string;
    context?: FlagContext;
  };

  /** 隐私合规配置 */
  privacy?: {
    defaultConsent?: 'granted' | 'denied' | 'unknown';
    anonymousMode?: boolean;
    sensitiveFields?: string[];
  };
}
```

#### `ProductConfig`

```typescript
interface ProductConfig {
  /** 产品名称 */
  name: string;
  /** 一句话描述 */
  tagline: string;
  /** 版本号 */
  version: string;
  /** 应用商店 URL */
  storeUrl: string;
  /** 支持页面 URL */
  supportUrl?: string;
  /** 默认语言 */
  locale: string;
}
```

#### `TriggerConfig`

```typescript
interface TriggerConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 触发器自定义参数 */
  [key: string]: unknown;
}
```

---

## 3. 触发器引擎 (`sdk.triggers`)

触发器引擎根据用户行为事件评估条件，在满足时执行预定义动作（如展示评分弹窗、发送邮件等）。

### `register(trigger: Trigger): void`

注册一个触发器。

```typescript
sdk.triggers.register({
  id: 'custom_rating',
  name: '自定义评分触发',
  condition: { type: 'usage_count', params: { sessionCount: 10 } },
  actions: [{ type: 'show_rating', config: { title: '喜欢我们的产品吗？' } }],
  cooldown: { minDaysBetween: 30, maxTriggers: 3, dailyLimit: 1 },
  enabled: true,
});
```

### `evaluate(event: UserEvent): void`

传入用户行为事件，引擎会遍历所有已注册触发器并评估条件。

```typescript
sdk.triggers.evaluate({
  type: 'session_start',
  timestamp: Date.now(),
  properties: { sessionCount: 5 },
});
```

### `getHistory(): TriggerHistory[]`

获取所有触发器的历史执行记录。

```typescript
const history = sdk.triggers.getHistory();
// [{ triggerId: 'second_session_rating', action: 'shown', timestamp: 1720000000000 }]
```

### 内置触发器工厂函数

| 工厂函数 | 说明 | 默认参数 |
|----------|------|----------|
| `createSecondSessionRating(options?)` | 第二次会话时展示评分请求 | `session: 2`, `delayMs: 3000` |
| `createUsageCountRating(options?)` | 使用 N 次后展示评分请求 | `count: 5`, `cooldownDays: 90` |
| `createInactiveReactivate(options?)` | 长期未使用时发送激活邮件 | `thresholdDays: 14`, `templateId: 'reactivation_d1'` |

```typescript
import { createSecondSessionRating, createUsageCountRating, createInactiveReactivate } from '@growth-sdk/core';

// 自定义参数
sdk.triggers.register(createSecondSessionRating({ session: 3, delayMs: 5000 }));
sdk.triggers.register(createUsageCountRating({ count: 10, cooldownDays: 60 }));
sdk.triggers.register(createInactiveReactivate({ thresholdDays: 7 }));
```

### `TriggerCondition` 类型

原子条件，描述单个判断逻辑。

```typescript
interface TriggerCondition {
  /** 条件类型 */
  type: 'usage_count' | 'days_inactive' | 'feature_complete' | 'payment' | 'milestone' | 'custom';
  /** 条件参数（各类型不同） */
  params: Record<string, unknown>;
}
```

### `CompositeCondition` 类型

组合条件，支持 `and` / `or` 逻辑嵌套。

```typescript
interface CompositeCondition {
  operator: 'and' | 'or';
  conditions: (TriggerCondition | CompositeCondition)[];
}
```

**示例 — 组合条件：**

```typescript
const condition: CompositeCondition = {
  operator: 'and',
  conditions: [
    { type: 'usage_count', params: { sessionCount: 5 } },
    {
      operator: 'or',
      conditions: [
        { type: 'feature_complete', params: { feature: 'export' } },
        { type: 'milestone', params: { milestone: 'first_project' } },
      ],
    },
  ],
};
```

### `Trigger` 类型

```typescript
interface Trigger {
  /** 触发器唯一 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 触发条件（支持原子或组合） */
  condition: TriggerCondition | CompositeCondition;
  /** 触发后执行的动作列表 */
  actions: TriggerAction[];
  /** 冷却配置 */
  cooldown: CooldownConfig;
  /** 是否启用 */
  enabled: boolean;
}
```

### `TriggerAction` 类型

```typescript
interface TriggerAction {
  type: 'show_rating' | 'show_share' | 'show_notification' | 'send_email' | 'custom';
  config: Record<string, unknown>;
}
```

### `CooldownConfig` 类型

```typescript
interface CooldownConfig {
  /** 两次触发间最少间隔天数 */
  minDaysBetween: number;
  /** 该触发器最大触发次数 */
  maxTriggers: number;
  /** 每日触发上限 */
  dailyLimit: number;
}
```

### `TriggerHistory` 类型

```typescript
interface TriggerHistory {
  triggerId: string;
  action: 'shown' | 'accepted' | 'dismissed' | 'error';
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### `UserEvent` 类型

```typescript
interface UserEvent {
  /** 事件类型 */
  type: string;
  /** 时间戳 */
  timestamp?: number;
  /** 事件属性 */
  properties?: Record<string, unknown>;
}
```

---

## 4. 模板引擎 (`sdk.templates`)

模板引擎管理增长内容模板（推广文案、触发消息、邮件模板等），支持多语言和 A/B 测试变体。

### `register(template: GrowthTemplate): void`

注册一个增长模板。

```typescript
sdk.templates.register({
  id: 'rating_prompt_en',
  type: 'trigger',
  name: '评分提示模板',
  locales: {
    en: { title: 'Enjoying {productName}?', body: 'A review helps others discover us!', cta: 'Rate Now' },
    zh: { title: '喜欢 {productName} 吗？', body: '您的评价帮助更多人发现我们！', cta: '立即评价' },
  },
  variables: [
    { name: 'productName', type: 'string', required: true, source: 'product' },
  ],
  platforms: ['chrome', 'web'],
});
```

### `render(id: string, options: RenderOptions): Promise<RenderedContent>`

渲染指定模板，根据 locale 和变量替换生成最终内容。如果有 A/B 变体，会按权重分配。

```typescript
const content = await sdk.templates.render('rating_prompt_en', {
  locale: 'zh',
  variables: { productName: 'MyApp' },
});
// { templateId: 'rating_prompt_en', locale: 'zh', title: '喜欢 MyApp 吗？', body: '...', cta: '立即评价', tags: [] }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 模板 ID |
| `options` | `RenderOptions` | ✅ | 渲染选项 |

### `getVariant(id: string): TemplateVariant | undefined`

获取当前用户被分配到的 A/B 测试变体。

```typescript
const variant = sdk.templates.getVariant('rating_prompt_en');
// { id: 'v2', name: 'Friendly tone', weight: 0.5, content: { ... } }
```

### `GrowthTemplate` 类型

```typescript
interface GrowthTemplate {
  /** 模板唯一 ID */
  id: string;
  /** 模板类型 */
  type: 'promotion' | 'trigger' | 'email';
  /** 显示名称 */
  name: string;
  /** 多语言内容映射 */
  locales: Record<string, LocaleContent>;
  /** 模板变量定义 */
  variables: TemplateVariable[];
  /** A/B 测试变体（可选） */
  variants?: TemplateVariant[];
  /** 适用平台 */
  platforms: PlatformType[];
  /** 关联推广渠道 */
  channel?: PromotionChannel;
}
```

### `LocaleContent` 类型

```typescript
interface LocaleContent {
  title?: string;
  body: string;
  subject?: string;   // 邮件主题
  cta?: string;       // 行动号召文案
  tags?: string[];    // 标签/话题
}
```

### `TemplateVariable` 类型

```typescript
interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  defaultValue?: unknown;
  source: 'product' | 'user' | 'custom';
}
```

### `TemplateVariant` 类型

```typescript
interface TemplateVariant {
  id: string;
  name: string;
  weight: number;         // 权重 0-1，所有变体权重之和应为 1
  content: LocaleContent;
}
```

### `RenderOptions` 类型

```typescript
interface RenderOptions {
  locale?: string;                       // 目标语言，默认取产品 locale
  variables?: Record<string, unknown>;    // 模板变量值
  variantId?: string;                    // 指定变体 ID（跳过随机分配）
}
```

### `RenderedContent` 类型

```typescript
interface RenderedContent {
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

---

## 5. 推广策略 (`sdk.promotion`)

推广策略引擎根据产品信息和渠道特性，生成定制化推广内容，支持策略推荐和反馈追踪。

### `generate(channel: PromotionChannel, options?: { locale?: string; [key: string]: unknown }): Promise<PromotionResult>`

为指定渠道生成推广内容。

```typescript
const result = await sdk.promotion.generate('product_hunt', { locale: 'en' });
// {
//   channel: 'product_hunt',
//   content: { title: '...', body: '...', cta: '...', tags: [...], url: '...' },
//   recommendedTime: Date(2026-07-16T06:00:00Z),
// }
```

### `getRecommendedStrategies(): PromotionStrategy[]`

获取根据当前产品信息推荐的推广策略列表。

```typescript
const strategies = sdk.promotion.getRecommendedStrategies();
// [{ platform: 'chrome', channel: 'product_hunt', contentTemplate: '...', timingStrategy: { ... }, targetAudience: { ... } }]
```

### `registerTrigger(trigger: PromotionTrigger): void`

注册推广触发器，当特定事件发生时自动在指定渠道执行推广动作。

```typescript
sdk.promotion.registerTrigger({
  event: 'version_release',
  channels: ['product_hunt', 'twitter', 'reddit'],
  autoAction: 'clipboard',
});
```

### `evaluate(event: PromotionEvent): void`

评估推广触发器。

```typescript
sdk.promotion.evaluate({
  type: 'version_release',
  properties: { version: '2.0.0' },
});
```

### `trackFeedback(feedback: Omit<PromotionFeedback, 'timestamp'>): Promise<void>`

记录推广反馈事件（浏览、点击、分享、转化）。

```typescript
await sdk.promotion.trackFeedback({
  channel: 'product_hunt',
  campaignId: 'launch_v2',
  event: 'clicked',
  properties: { source: 'email' },
});
```

### `getPerformance(): ChannelPerformance[]`

获取各渠道的效果统计。

```typescript
const performance = sdk.promotion.getPerformance();
// [{ channel: 'product_hunt', views: 1200, clicks: 89, shares: 34, conversions: 12, clickRate: 0.074, conversionRate: 0.135 }]
```

### `getRecommendedChannels(): ChannelPerformance[]`

获取推荐渠道排序（按转化率降序）。

```typescript
const recommended = sdk.promotion.getRecommendedChannels();
// 转化率最高的渠道排在前面
```

### `PromotionChannel` 枚举

```typescript
type PromotionChannel =
  | 'product_hunt'    // Product Hunt
  | 'reddit'          // Reddit
  | 'hacker_news'     // Hacker News
  | 'twitter'         // Twitter/X
  | 'indie_hackers'   // Indie Hackers
  | 'seo'             // 搜索引擎优化
  | 'discord'         // Discord 社区
  | 'linkedin';       // LinkedIn
```

### `PromotContent` 类型

```typescript
interface PromotContent {
  title: string;
  body: string;
  cta?: string;
  tags: string[];
  recommendedTime?: Date;
  url?: string;
}
```

### `PromotionStrategy` 类型

```typescript
interface PromotionStrategy {
  platform: PlatformType;
  channel: PromotionChannel;
  contentTemplate: string;
  timingStrategy: TimingStrategy;
  targetAudience: AudienceProfile;
}
```

### `PromotionTrigger` 类型

```typescript
interface PromotionTrigger {
  event: 'version_release' | 'milestone' | 'growth_stagnation' | 'first_rating' | 'feature_release';
  channels: PromotionChannel[];
  autoAction?: 'clipboard' | 'open_page' | 'notification';
}
```

### `PromotionEvent` 类型

```typescript
interface PromotionEvent {
  type: PromotionTrigger['event'];
  properties?: Record<string, unknown>;
}
```

### `PromotionResult` 类型

```typescript
interface PromotionResult {
  channel: PromotionChannel;
  content: PromotContent;
  recommendedTime?: Date;
}
```

### `ProductInfo` 类型

```typescript
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

### `TimingStrategy` 类型

```typescript
interface TimingStrategy {
  trigger: 'version_release' | 'milestone' | 'manual';
  delayDays: number;
  milestone?: string;
}
```

### `AudienceProfile` 类型

```typescript
interface AudienceProfile {
  locale: string;
  segment: string;
  subreddits?: string[];
}
```

### `PromotionFeedback` 类型

```typescript
interface PromotionFeedback {
  channel: PromotionChannel;
  campaignId?: string;
  event: 'viewed' | 'clicked' | 'shared' | 'converted';
  timestamp: number;
  properties?: Record<string, unknown>;
}
```

### `ChannelPerformance` 类型

```typescript
interface ChannelPerformance {
  channel: PromotionChannel;
  views: number;
  clicks: number;
  shares: number;
  conversions: number;
  clickRate: number;        // 点击率 = clicks / views
  conversionRate: number;   // 转化率 = conversions / clicks
}
```

---

## 6. 事件追踪 (`sdk.analytics`)

### `track(name: string, properties?: Record<string, unknown>): void`

追踪自定义事件。会经过隐私合规脱敏处理。

```typescript
sdk.analytics.track('feature_used', {
  featureName: 'export',
  duration: 1200,
});
```

### `identify(userId: string, traits?: Record<string, unknown>): void`

标识当前用户。匿名模式下会脱敏 `userId`。

```typescript
sdk.analytics.identify('user_12345', {
  plan: 'pro',
  signupDate: '2026-01-15',
});
```

### 自动追踪事件列表

SDK 在内部自动追踪以下事件：

| 事件名 | 触发时机 | 属性 |
|--------|----------|------|
| `sdk_initialized` | `init()` 完成后 | `platform`, `version`, `locale` |
| `trigger_shown` | 触发器动作展示 | `triggerId`, `actionType` |
| `trigger_accepted` | 用户接受触发 | `triggerId` |
| `trigger_dismissed` | 用户关闭触发 | `triggerId` |
| `content_published` | 内容发布成功 | `channel`, `postId`, `url` |
| `content_publish_failed` | 内容发布失败 | `channel`, `error` |
| `content_publish_fallback` | 内容发布降级 | `channel`, `reason`, `fallback` |
| `promotion_viewed` / `clicked` / `shared` / `converted` | 推广反馈 | `channel`, `campaignId` |
| `attribution_touch` | 归因触点 | `source`, `channel` |
| `attribution_conversion` | 归因转化 | `event`, `source` |

### `AnalyticsProvider` 接口

自定义分析提供商需实现此接口：

```typescript
interface AnalyticsProvider {
  /** 提供商名称 */
  name: string;
  /** 初始化 */
  init(config: Record<string, unknown>): void;
  /** 追踪事件 */
  track(event: AnalyticsEvent): void;
  /** 标识用户 */
  identify(userId: string, traits?: Record<string, unknown>): void;
}
```

**自定义 Provider 示例：**

```typescript
const mixpanelProvider: AnalyticsProvider = {
  name: 'mixpanel',
  init(config) {
    mixpanel.init(config.token as string);
  },
  track(event) {
    mixpanel.track(event.name, event.properties);
  },
  identify(userId, traits) {
    mixpanel.identify(userId, traits);
  },
};
```

### `AnalyticsEvent` 类型

```typescript
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}
```

### 内置漏斗定义

```typescript
const BUILTIN_FUNNELS: Record<string, string[]> = {
  onboarding:   ['sdk_initialized', 'first_action', 'second_session'],
  engagement:   ['trigger_shown', 'trigger_accepted', 'rating_opened', 'share_completed'],
  reactivation: ['email_triggered', 'app_reopened', 'action_taken'],
  conversion:   ['pricing_viewed', 'payment_initiated', 'payment_completed'],
};
```

---

## 7. 隐私合规 (`sdk.privacy`)

隐私合规模块管理用户数据同意状态、匿名模式和敏感字段脱敏。

### `grant(): void`

授予数据追踪同意。

```typescript
sdk.privacy.grant();
// 此后 track() / identify() 将正常发送数据
```

### `deny(): void`

拒绝数据追踪同意。

```typescript
sdk.privacy.deny();
// 此后 track() / identify() 将被静默跳过
```

### `isGranted(): boolean`

检查当前是否已授权。

```typescript
if (sdk.privacy.isGranted()) {
  console.log('用户已同意数据追踪');
}
```

### `setAnonymousMode(enabled: boolean): void`

启用/禁用匿名模式。匿名模式下，`userId` 会被脱敏。

```typescript
sdk.privacy.setAnonymousMode(true);   // 启用匿名模式
sdk.privacy.setAnonymousMode(false);  // 关闭匿名模式
```

### `ConsentManager` 类

```typescript
import { ConsentManager } from '@growth-sdk/core';

const manager = new ConsentManager({
  defaultConsent: 'unknown',
  anonymousMode: false,
  sensitiveFields: ['email', 'phone', 'custom_field'],
});

manager.grant();
manager.deny();
manager.isGranted();          // false
manager.setAnonymousMode(true);
manager.anonymousMode;        // true
manager.consentState;         // 'denied'
```

### `ConsentManagerOptions` 类型

```typescript
interface ConsentManagerOptions {
  defaultConsent?: ConsentState;    // 默认 'unknown'
  anonymousMode?: boolean;          // 默认 false
  sensitiveFields?: string[];       // 追加到默认列表
}
```

### `ConsentState` 类型

```typescript
type ConsentState = 'unknown' | 'granted' | 'denied';
```

### 脱敏规则

`ConsentManager.sanitize(properties)` 会移除所有标记为敏感的 key。

**默认敏感字段列表：**

`email`, `phone`, `ip`, `ipAddress`, `phoneNumber`, `mail`

可通过 `sensitiveFields` 配置追加自定义字段。在 `track()` 和 `identify()` 调用时，SDK 会自动对 `properties` 执行脱敏。

```typescript
// 假设配置了 sensitiveFields: ['custom_secret']
const sanitized = manager.sanitize({
  name: 'Alice',
  email: 'alice@example.com',      // 被移除
  custom_secret: 'xxx',            // 被移除
});
// { name: 'Alice' }
```

---

## 8. Feature Flags (`sdk.flags`)

Feature Flags 模块支持布尔开关、百分比灰度和多变体分发三种类型，可配合远程配置和目标用户规则使用。

### `register(flag: FeatureFlag): void`

注册一个 Feature Flag。

```typescript
sdk.flags.register({
  key: 'new_onboarding',
  type: 'boolean',
  enabled: true,
  defaultValue: false,
  rules: [
    { field: 'locale', operator: 'in', value: ['zh', 'en'] },
  ],
});
```

### `evaluate(key: string, context?: FlagContext): FlagResult`

评估单个 Flag 的值。

```typescript
const result = sdk.flags.evaluate('new_onboarding', { locale: 'zh', version: '1.0.0' });
// { key: 'new_onboarding', value: true, reason: 'rule_match' }
```

### `evaluateAll(context?: FlagContext): FlagResult[]`

评估所有已注册 Flag。

```typescript
const allFlags = sdk.flags.evaluateAll({ locale: 'en', platform: 'chrome' });
// [{ key: 'new_onboarding', value: true, reason: 'rule_match' }, ...]
```

### `setContext(context: FlagContext): void`

设置全局评估上下文，后续 `evaluate()` 调用可不传 context。

```typescript
sdk.flags.setContext({ locale: 'zh', platform: 'chrome', version: '1.0.0' });
const result = sdk.flags.evaluate('new_onboarding');  // 使用全局 context
```

### `loadRemoteConfig(url: string): Promise<void>`

从远程 URL 加载 Feature Flag 配置（JSON 格式）。

```typescript
await sdk.flags.loadRemoteConfig('https://config.example.com/feature-flags.json');
```

### `FeatureFlag` 类型

```typescript
interface FeatureFlag {
  /** Flag 唯一标识 */
  key: string;
  /** Flag 类型 */
  type: FlagType;
  /** 是否启用 */
  enabled: boolean;
  /** 默认值 */
  defaultValue: boolean | string | number;
  /** 流量百分比（percentage 类型专用，0-100） */
  percentage?: number;
  /** 变体列表（variant 类型专用） */
  variants?: Array<{ name: string; weight: number }>;
  /** 目标用户规则 */
  rules?: FlagRule[];
  /** 远程配置值 */
  remoteConfig?: string | Record<string, unknown>;
}
```

### `FlagType` 类型

```typescript
type FlagType = 'boolean' | 'variant' | 'percentage';
```

### `FlagRule` 类型

```typescript
interface FlagRule {
  /** 匹配字段：'platform' | 'locale' | 'version' | 'userId' 或自定义 */
  field: string;
  /** 运算符 */
  operator: 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'contains';
  /** 比较值 */
  value: unknown;
}
```

### `FlagContext` 类型

```typescript
interface FlagContext {
  platform?: string;
  locale?: string;
  version?: string;
  userId?: string;
  [key: string]: unknown;   // 支持自定义字段
}
```

### `FlagResult` 类型

```typescript
interface FlagResult {
  key: string;
  value: boolean | string | number;
  reason: 'default' | 'rule_match' | 'percentage' | 'variant' | 'disabled';
}
```

### 评估规则说明

评估按以下优先级顺序执行：

1. **disabled** — 如果 `enabled: false`，返回 `defaultValue`，reason 为 `disabled`
2. **rule_match** — 按 `rules` 数组顺序逐条匹配，第一条命中的规则决定结果
3. **percentage** — 对 `percentage` 类型，根据 `userId` 哈希值判断是否落入灰度比例
4. **variant** — 对 `variant` 类型，按变体 `weight` 加权随机分配
5. **default** — 无规则匹配时返回 `defaultValue`

---

## 9. 发布模块 (`sdk.publish`)

> **注意：** 发布模块（`PublishEngine`）在当前版本的 `GrowthSDK` 主类中尚未挂载为 `sdk.publish` 属性。可通过直接实例化 `PublishEngine` 使用。

```typescript
import { PublishEngine } from '@growth-sdk/core';  // 如已导出
```

### `configure(config: PublishChannelConfig): void`

更新渠道认证配置（与已有配置合并）。

```typescript
engine.configure({
  discord: { webhookUrl: 'https://discord.com/api/webhooks/xxx' },
  reddit: {
    clientId: 'xxx',
    clientSecret: 'xxx',
    refreshToken: 'xxx',
    userAgent: 'MyApp/1.0',
    defaultSubreddit: 'sideproject',
  },
});
```

### `publish(channel: PromotionChannel, content: PromotContent, options?: PublishOptions): Promise<PublishResult>`

发布内容到单个渠道。如果提供商未注册或认证失败，会执行降级策略。

```typescript
const result = await engine.publish('product_hunt', {
  title: 'MyApp 2.0 发布！',
  body: '全新界面，更快速度，更多功能。',
  cta: '立即体验',
  tags: ['productivity', 'chrome-extension'],
  url: 'https://myapp.com',
});
// { success: true, channel: 'product_hunt', postId: '123456', url: 'https://producthunt.com/posts/...' }
```

### `publishAll(channels: PromotionChannel[], content: PromotContent, options?: PublishOptions): Promise<PublishResult[]>`

批量发布到多个渠道（并行执行）。

```typescript
const results = await engine.publishAll(
  ['product_hunt', 'twitter', 'reddit'],
  content,
  { subreddit: 'sideproject' },
);
// [{ success: true, channel: 'product_hunt', ... }, { success: true, channel: 'twitter', ... }, ...]
```

### `getAvailableChannels(): PromotionChannel[]`

获取已注册提供商的渠道列表。

```typescript
const channels = engine.getAvailableChannels();
// ['product_hunt', 'twitter', 'reddit']
```

### `isAvailable(channel: PromotionChannel): boolean`

检查渠道是否可用（已注册且已认证）。

```typescript
engine.isAvailable('product_hunt');  // true
engine.isAvailable('discord');       // false
```

### `registerProvider(provider: PublishProvider): void`

注册自定义发布提供商。

```typescript
engine.registerProvider({
  name: 'custom-provider',
  channel: 'discord',
  isAuthenticated: () => true,
  authenticate: async () => {},
  publish: async (content, options) => ({
    success: true,
    channel: 'discord',
    postId: 'msg_xxx',
  }),
});
```

### `PublishChannelConfig` 配置

```typescript
interface PublishChannelConfig {
  discord?: {
    webhookUrl: string;
  };
  reddit?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    userAgent: string;
    defaultSubreddit?: string;
  };
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    useBuffer?: boolean;         // 使用 Buffer 代理（节省 X API 费用）
    bufferApiKey?: string;
  };
  linkedin?: {
    accessToken: string;
    authorUrn: string;
  };
  productHunt?: {
    developerToken: string;
  };
}
```

### `PublishOptions` 类型

```typescript
interface PublishOptions {
  subreddit?: string;            // Reddit 目标 subreddit
  webhookUrl?: string;           // Discord webhook URL（覆盖全局配置）
  authorUrn?: string;            // LinkedIn 作者 URN（覆盖全局配置）
  scheduledAt?: Date;            // 定时发布时间
  draft?: boolean;               // 是否为草稿
  extra?: Record<string, unknown>; // 自定义额外参数
}
```

### `PublishResult` 类型

```typescript
interface PublishResult {
  success: boolean;
  channel: PromotionChannel;
  postId?: string;
  url?: string;
  error?: string;
  fallback?: 'clipboard' | 'open_page' | 'none';  // 降级类型
}
```

### `PublishProvider` 接口

```typescript
interface PublishProvider {
  name: string;
  channel: PromotionChannel;
  isAuthenticated(): boolean;
  authenticate(config: Record<string, unknown>): Promise<void>;
  publish(content: PromotContent, options?: PublishOptions): Promise<PublishResult>;
}
```

### 降级策略说明

当发布失败时（无提供商、认证失败、发布异常），引擎执行以下降级流程：

1. **复制到剪贴板** — 将 `title + body` 写入 `navigator.clipboard`
2. **打开平台发布页面** — 自动 `window.open()` 打开对应平台的 Web 发布页
3. 返回 `PublishResult` 中 `fallback` 标记降级类型

### 各平台发布页面 URL

| 渠道 | URL |
|------|-----|
| `product_hunt` | `https://www.producthunt.com/posts/new` |
| `reddit` | `https://www.reddit.com/submit` |
| `hacker_news` | `https://news.ycombinator.com/submit` |
| `twitter` | `https://x.com/compose/post` |
| `linkedin` | `https://www.linkedin.com/post/new` |
| `indie_hackers` | `https://www.indiehackers.com/post/new` |

---

## 10. A/B 测试统计 (`ExperimentStats`)

```typescript
import { ExperimentStats } from '@growth-sdk/core';
```

### `zTest(control: VariantStats, treatment: VariantStats): { zScore: number; pValue: number }`

对两个变体执行双尾 Z 检验，判断 A/B 测试结果是否具有统计显著性。

```typescript
const { zScore, pValue } = ExperimentStats.zTest(
  { variantId: 'control', samples: 1000, conversions: 50, conversionRate: 0.05 },
  { variantId: 'treatment', samples: 1000, conversions: 70, conversionRate: 0.07 },
);
// { zScore: 1.83, pValue: 0.067 }
```

### `minimumSampleSize(baselineRate: number, mde: number, alpha?: number, power?: number): number`

计算 A/B 测试所需最小样本量（每组）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `baselineRate` | `number` | — | 基线转化率 |
| `mde` | `number` | — | 最小可检测效应（相对提升比例） |
| `alpha` | `number` | `0.05` | 显著性水平 |
| `power` | `number` | `0.8` | 统计功效 |

```typescript
const n = ExperimentStats.minimumSampleSize(0.05, 0.3, 0.05, 0.8);
// 3424 — 每组至少需要 3424 个样本
```

### `analyze(experimentId: string, variants: VariantStats[], alpha?: number): ExperimentResult`

完整分析实验结果，自动执行 Z 检验并判定胜者。

- `variants[0]` 被视为 control 组
- 样本量 < 30 时直接判定不显著
- 仅在显著且 treatment 转化率更高时才判定 winner

```typescript
const result = ExperimentStats.analyze('onboarding_ab', [
  { variantId: 'control', samples: 500, conversions: 25, conversionRate: 0.05 },
  { variantId: 'friendly', samples: 500, conversions: 45, conversionRate: 0.09 },
], 0.05);
// {
//   experimentId: 'onboarding_ab',
//   variants: [...],
//   winner: 'friendly',
//   confidence: 0.97,
//   isSignificant: true,
//   pValue: 0.03,
// }
```

### `VariantStats` 类型

```typescript
interface VariantStats {
  variantId: string;
  samples: number;
  conversions: number;
  conversionRate: number;
}
```

### `ExperimentResult` 类型

```typescript
interface ExperimentResult {
  experimentId: string;
  variants: VariantStats[];
  winner?: string;          // 胜者变体 ID（仅显著时存在）
  confidence: number;       // 1 - pValue
  isSignificant: boolean;
  pValue: number;
}
```

---

## 11. 归因追踪 (`AttributionTracker`)

```typescript
import { AttributionTracker } from '@growth-sdk/core';
```

### `parseUTM(url: string): UTMParams` _(静态方法)_

从 URL 中解析 UTM 参数。

```typescript
const utm = AttributionTracker.parseUTM('https://example.com?utm_source=twitter&utm_medium=social&utm_campaign=launch');
// { utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'launch' }
```

### `buildUTMUrl(baseUrl: string, utm: UTMParams): string` _(静态方法)_

生成带 UTM 参数的推广 URL。

```typescript
const url = AttributionTracker.buildUTMUrl('https://myapp.com', {
  utm_source: 'producthunt',
  utm_medium: 'launch',
  utm_campaign: 'v2_release',
});
// 'https://myapp.com/?utm_source=producthunt&utm_medium=launch&utm_campaign=v2_release'
```

### `channelUTM(channel: PromotionChannel, campaign?: string): UTMParams` _(静态方法)_

为推广渠道自动生成标准 UTM 参数。

```typescript
const utm = AttributionTracker.channelUTM('product_hunt', 'v2_release');
// { utm_source: 'producthunt', utm_medium: 'launch', utm_campaign: 'v2_release' }

const utm2 = AttributionTracker.channelUTM('reddit');
// { utm_source: 'reddit', utm_medium: 'social' }
```

**渠道 UTM 映射：**

| 渠道 | `utm_source` | `utm_medium` |
|------|-------------|-------------|
| `product_hunt` | `producthunt` | `launch` |
| `reddit` | `reddit` | `social` |
| `hacker_news` | `hackernews` | `social` |
| `twitter` | `twitter` | `social` |
| `indie_hackers` | `indiehackers` | `social` |
| `seo` | `organic` | `seo` |
| `discord` | `discord` | `community` |
| `linkedin` | `linkedin` | `social` |

### `trackTouch(utm: UTMParams, channel: PromotionChannel): Promise<void>`

记录归因触点（用户通过某渠道访问）。

```typescript
const tracker = new AttributionTracker(adapter);
await tracker.trackTouch({ utm_source: 'twitter', utm_medium: 'social' }, 'twitter');
```

### `trackConversion(event: string, properties?: Record<string, unknown>): Promise<void>`

记录转化事件，自动关联到最近的归因触点。

```typescript
await tracker.trackConversion('purchase', { amount: 29.99, plan: 'pro' });
```

### `UTMParams` 类型

```typescript
interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}
```

### `AttributionRecord` 类型

```typescript
interface AttributionRecord {
  id: string;
  utm: UTMParams;
  channel: PromotionChannel;
  firstTouchAt: number;
  lastTouchAt: number;
  conversions: number;
}
```

---

## 12. Chrome 适配器

```typescript
import { ChromeAdapter, ChromeUI, ChromeStorage, ChromeLinks } from '@growth-sdk/adapter-chrome';
```

### `ChromeAdapter`

Chrome 扩展平台的 `PlatformAdapter` 实现，封装了 `chrome.storage`、DOM UI 和扩展链接。

```typescript
const adapter = new ChromeAdapter({
  storeUrl: 'https://chromewebstore.google.com/detail/your-extension-id',
  uiRenderer: myCustomRenderer,  // 可选：自定义 UI 渲染器
});
```

### `ChromeAdapterOptions` 类型

```typescript
interface ChromeAdapterOptions {
  /** Chrome Web Store URL */
  storeUrl: string;
  /** 自定义 UI 渲染器（可选） */
  uiRenderer?: UIRenderer;
}
```

### `UIRenderer` 接口

自定义 UI 渲染器接口。实现此接口可替换默认的 DOM 弹窗/通知 UI。

```typescript
interface UIRenderer {
  /** 自定义评分弹窗渲染 */
  renderRatingPrompt?(config: RatingPromptConfig, container: HTMLElement): Promise<RatingAction>;
  /** 自定义通知渲染 */
  renderNotification?(config: NotificationConfig, container: HTMLElement): Promise<void>;
  /** 自定义分享对话框渲染 */
  renderShareDialog?(config: ShareConfig, container: HTMLElement): Promise<void>;
}
```

**自定义渲染器示例：**

```typescript
const myRenderer: UIRenderer = {
  renderRatingPrompt: async (config, container) => {
    // 使用 React/Vue/Svelte 渲染自定义评分弹窗
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.textContent = config.title;
      el.onclick = () => resolve({ type: 'open_store' });
      container.appendChild(el);
    });
  },
};

const adapter = new ChromeAdapter({ storeUrl: '...', uiRenderer: myRenderer });
```

### `ChromeUIOptions` 类型

```typescript
interface ChromeUIOptions {
  renderer?: UIRenderer;
}
```

### 默认 UI 行为

| 方法 | 默认行为 |
|------|----------|
| `showRatingPrompt(config)` | 创建模态对话框，显示标题 + 选项按钮 |
| `showNotification(config)` | 右上角 Toast 通知，默认 5 秒后消失 |
| `showShareDialog(config)` | 打开 Twitter 分享窗口 |

---

## 13. 平台适配器接口 (`PlatformAdapter`)

`PlatformAdapter` 是 SDK 与平台交互的核心契约。所有平台功能通过此接口抽象，使 SDK 可运行在不同环境。

### 接口定义

```typescript
interface PlatformAdapter {
  storage: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
  };

  ui: {
    showRatingPrompt(config: RatingPromptConfig): Promise<RatingAction>;
    showNotification(config: NotificationConfig): Promise<void>;
    showShareDialog(config: ShareConfig): Promise<void>;
  };

  links: {
    openStorePage(): void;
    openShareUrl(url: string): void;
    getStoreUrl(): string;
  };

  device: {
    getPlatform(): PlatformType;
    getVersion(): string;
    getLocale(): string;
  };
}
```

### `storage` — 持久化存储

| 方法 | 说明 |
|------|------|
| `get<T>(key)` | 读取值，不存在返回 `null` |
| `set(key, value)` | 写入值 |
| `remove(key)` | 删除值 |

### `ui` — UI 展示

| 方法 | 说明 |
|------|------|
| `showRatingPrompt(config)` | 展示评分弹窗，返回用户动作 |
| `showNotification(config)` | 展示通知 Toast |
| `showShareDialog(config)` | 展示分享对话框 |

### `links` — 链接跳转

| 方法 | 说明 |
|------|------|
| `openStorePage()` | 打开应用商店页面 |
| `openShareUrl(url)` | 打开分享 URL |
| `getStoreUrl()` | 获取商店 URL |

### `device` — 设备/环境信息

| 方法 | 说明 |
|------|------|
| `getPlatform()` | 返回平台类型 |
| `getVersion()` | 返回应用版本号 |
| `getLocale()` | 返回语言代码 |

### 相关类型

```typescript
type PlatformType = 'chrome' | 'vscode' | 'shopify' | 'figma' | 'wordpress' | 'notion' | 'web';
```

```typescript
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
```

```typescript
type RatingAction = { type: 'open_store' | 'show_feedback' | 'dismiss' };
```

```typescript
interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'celebration';
  cta?: { label: string; url: string };
  duration?: number;
}
```

```typescript
interface ShareConfig {
  title: string;
  text: string;
  url: string;
  channels?: string[];
}
```

### 自定义适配器开发指南

实现 `PlatformAdapter` 接口即可将 SDK 移植到新平台。核心步骤：

1. **实现 `storage`** — 基于平台存储 API（如 `localStorage`、`SharedPreferences`、`NSUserDefaults` 等）
2. **实现 `ui`** — 基于平台 UI 框架渲染弹窗/通知
3. **实现 `links`** — 调用平台 API 打开外部链接
4. **实现 `device`** — 返回平台信息

**VS Code 适配器示例（伪代码）：**

```typescript
import type { PlatformAdapter } from '@growth-sdk/core';

export class VSCodeAdapter implements PlatformAdapter {
  storage = {
    async get<T>(key: string): Promise<T | null> {
      const value = context.globalState.get(key);
      return value ?? null;
    },
    async set(key: string, value: unknown): Promise<void> {
      await context.globalState.update(key, value);
    },
    async remove(key: string): Promise<void> {
      await context.globalState.update(key, undefined);
    },
  };

  ui = {
    async showRatingPrompt(config) {
      const action = await vscode.window.showInformationMessage(
        config.title,
        ...config.options.map(o => o.label),
      );
      return { type: action === config.options[0].label ? 'open_store' : 'dismiss' };
    },
    async showNotification(config) {
      vscode.window.showInformationMessage(config.message);
    },
    async showShareDialog(config) {
      vscode.env.openExternal(vscode.Uri.parse(config.url));
    },
  };

  links = {
    openStorePage() { vscode.env.openExternal(vscode.Uri.parse(storeUrl)); },
    openShareUrl(url) { vscode.env.openExternal(vscode.Uri.parse(url)); },
    getStoreUrl() { return storeUrl; },
  };

  device = {
    getPlatform: () => 'vscode' as const,
    getVersion: () => extensionPackage.version,
    getLocale: () => vscode.env.language.split('-')[0],
  };
}
```

---

## 14. 类型索引

所有公开类型按模块分组汇总。

### 核心配置

| 类型 | 来源模块 |
|------|----------|
| `GrowthSDKConfig` | `adapter` |
| `ProductConfig` | `adapter` |
| `TriggerConfig` | `adapter` |
| `PlatformType` | `adapter` |
| `PlatformAdapter` | `adapter` |
| `RatingPromptConfig` | `adapter` |
| `RatingAction` | `adapter` |
| `NotificationConfig` | `adapter` |
| `ShareConfig` | `adapter` |

### 触发器

| 类型 | 来源模块 |
|------|----------|
| `Trigger` | `triggers/types` |
| `TriggerCondition` | `triggers/types` |
| `CompositeCondition` | `triggers/types` |
| `TriggerAction` | `triggers/types` |
| `CooldownConfig` | `triggers/types` |
| `TriggerHistory` | `triggers/types` |
| `UserEvent` | `triggers/types` |

### 模板

| 类型 | 来源模块 |
|------|----------|
| `GrowthTemplate` | `templates/types` |
| `LocaleContent` | `templates/types` |
| `TemplateVariable` | `templates/types` |
| `TemplateVariant` | `templates/types` |
| `RenderOptions` | `templates/types` |
| `RenderedContent` | `templates/types` |

### A/B 测试统计

| 类型 | 来源模块 |
|------|----------|
| `VariantStats` | `templates/statistics` |
| `ExperimentResult` | `templates/statistics` |

### 推广

| 类型 | 来源模块 |
|------|----------|
| `PromotionChannel` | `promotion/types` |
| `PromotionStrategy` | `promotion/types` |
| `PromotionTrigger` | `promotion/types` |
| `PromotionEvent` | `promotion/types` |
| `PromotionResult` | `promotion/types` |
| `PromotContent` | `promotion/types` |
| `ProductInfo` | `promotion/types` |
| `TimingStrategy` | `promotion/types` |
| `AudienceProfile` | `promotion/types` |

### 推广反馈

| 类型 | 来源模块 |
|------|----------|
| `PromotionFeedback` | `promotion/feedback` |
| `ChannelPerformance` | `promotion/feedback` |

### 归因

| 类型 | 来源模块 |
|------|----------|
| `UTMParams` | `promotion/attribution` |
| `AttributionRecord` | `promotion/attribution` |

### 分析

| 类型 | 来源模块 |
|------|----------|
| `AnalyticsEvent` | `analytics/types` |
| `AnalyticsProvider` | `adapter` |

### 隐私合规

| 类型 | 来源模块 |
|------|----------|
| `ConsentState` | `analytics/consent` |
| `ConsentManagerOptions` | `analytics/consent` |

### 邮件

| 类型 | 来源模块 |
|------|----------|
| `EmailTemplate` | `email/types` |
| `EmailConfig` | `email/types` |

### Feature Flags

| 类型 | 来源模块 |
|------|----------|
| `FeatureFlag` | `feature-flags/types` |
| `FlagType` | `feature-flags/types` |
| `FlagRule` | `feature-flags/types` |
| `FlagContext` | `feature-flags/types` |
| `FlagResult` | `feature-flags/types` |

### 发布

| 类型 | 来源模块 |
|------|----------|
| `PublishProvider` | `publish/types` |
| `PublishOptions` | `publish/types` |
| `PublishResult` | `publish/types` |
| `PublishChannelConfig` | `publish/types` |

---

## 15. 完整配置示例

以下展示一个包含所有模块的 GrowthSDK 初始化代码：

```typescript
import { GrowthSDK, AttributionTracker, ExperimentStats } from '@growth-sdk/core';
import { ChromeAdapter } from '@growth-sdk/adapter-chrome';

// ─── 1. 创建平台适配器 ───
const adapter = new ChromeAdapter({
  storeUrl: 'https://chromewebstore.google.com/detail/your-extension-id',
});

// ─── 2. 创建 SDK 实例（完整配置） ───
const sdk = new GrowthSDK({
  adapter,

  product: {
    name: 'MyAwesomeExtension',
    tagline: 'Supercharge your browser workflow',
    version: '2.0.0',
    storeUrl: 'https://chromewebstore.google.com/detail/your-extension-id',
    supportUrl: 'https://myapp.com/support',
    locale: 'en',
  },

  // 分析提供商
  analytics: {
    provider: {
      name: 'posthog',
      init(config) {
        posthog.init(config.apiKey as string, { host: config.host as string });
      },
      track(event) {
        posthog.capture(event.name, event.properties);
      },
      identify(userId, traits) {
        posthog.identify(userId, traits);
      },
    },
  },

  // 邮件服务
  email: {
    provider: 'resend',
    apiEndpoint: 'https://api.resend.com',
    apiKey: 're_xxxxxxxxxxxx',
  },

  // 触发器配置覆盖
  triggers: {
    second_session_rating: { enabled: true, session: 3 },
    usage_count_rating: { enabled: true, count: 8, cooldownDays: 60 },
    inactive_reactivate: { enabled: true, thresholdDays: 10 },
  },

  // Feature Flags
  featureFlags: {
    remoteConfigUrl: 'https://config.myapp.com/flags.json',
    context: { platform: 'chrome', locale: 'en', version: '2.0.0' },
  },

  // 隐私合规
  privacy: {
    defaultConsent: 'unknown',
    anonymousMode: false,
    sensitiveFields: ['address', 'company'],
  },
});

// ─── 3. 初始化 SDK ───
await sdk.init();

// ─── 4. 隐私合规：请求用户同意 ───
if (!sdk.privacy.isGranted()) {
  const userConsented = await showConsentDialog();  // 自定义 UI
  if (userConsented) {
    sdk.privacy.grant();
  } else {
    sdk.privacy.deny();
    sdk.privacy.setAnonymousMode(true);  // 匿名模式下仍可追踪脱敏数据
  }
}

// ─── 5. 注册自定义触发器 ───
sdk.triggers.register({
  id: 'milestone_share',
  name: '达成里程碑后分享',
  condition: {
    operator: 'and',
    conditions: [
      { type: 'usage_count', params: { sessionCount: 20 } },
      { type: 'milestone', params: { milestone: 'first_export' } },
    ],
  },
  actions: [{ type: 'show_share', config: {} }],
  cooldown: { minDaysBetween: 30, maxTriggers: 2, dailyLimit: 1 },
  enabled: true,
});

// ─── 6. 注册模板 ───
sdk.templates.register({
  id: 'share_template',
  type: 'promotion',
  name: '分享推广模板',
  locales: {
    en: {
      title: 'I just hit a milestone with {productName}! 🎉',
      body: '{productName} helped me {coreBenefit}. Give it a try!',
      cta: 'Try it free',
    },
    zh: {
      title: '我在 {productName} 达成了一个里程碑！🎉',
      body: '{productName} 帮助我 {coreBenefit}，快来试试！',
      cta: '免费试用',
    },
  },
  variables: [
    { name: 'productName', type: 'string', required: true, source: 'product' },
    { name: 'coreBenefit', type: 'string', required: true, source: 'custom' },
  ],
  variants: [
    { id: 'v1', name: 'Direct tone', weight: 0.5, content: { body: 'Try {productName} now!' } },
    { id: 'v2', name: 'Friendly tone', weight: 0.5, content: { body: 'Give {productName} a spin!' } },
  ],
  platforms: ['chrome', 'web'],
  channel: 'twitter',
});

// ─── 7. 注册 Feature Flags ───
sdk.flags.register({
  key: 'new_share_flow',
  type: 'boolean',
  enabled: true,
  defaultValue: false,
  rules: [
    { field: 'locale', operator: 'in', value: ['en', 'zh'] },
    { field: 'version', operator: 'gt', value: '1.5.0' },
  ],
});

sdk.flags.register({
  key: 'onboarding_variant',
  type: 'variant',
  enabled: true,
  defaultValue: 'classic',
  variants: [
    { name: 'classic', weight: 0.7 },
    { name: 'simplified', weight: 0.3 },
  ],
});

// ─── 8. 推广策略 ───
const strategies = sdk.promotion.getRecommendedStrategies();
const content = await sdk.promotion.generate('product_hunt', { locale: 'en' });

sdk.promotion.registerTrigger({
  event: 'version_release',
  channels: ['product_hunt', 'twitter', 'reddit'],
  autoAction: 'clipboard',
});

// ─── 9. 归因追踪 ───
const tracker = new AttributionTracker(adapter);
const utm = AttributionTracker.channelUTM('product_hunt', 'v2_launch');
const shareUrl = AttributionTracker.buildUTMUrl('https://myapp.com', utm);
await tracker.trackTouch(utm, 'product_hunt');

// ─── 10. 事件追踪 ───
sdk.analytics.track('feature_used', { feature: 'export', format: 'pdf' });
sdk.analytics.identify('user_12345', { plan: 'pro', company: 'Acme' });

// ─── 11. A/B 测试分析 ───
const minSamples = ExperimentStats.minimumSampleSize(0.05, 0.3);
const experimentResult = ExperimentStats.analyze('share_cta_ab', [
  { variantId: 'control', samples: 2000, conversions: 100, conversionRate: 0.05 },
  { variantId: 'emoji_cta', samples: 2000, conversions: 140, conversionRate: 0.07 },
]);

if (experimentResult.isSignificant && experimentResult.winner) {
  console.log(`胜者变体: ${experimentResult.winner}，置信度: ${(experimentResult.confidence * 100).toFixed(1)}%`);
}

// ─── 12. 销毁（应用关闭时调用） ───
window.addEventListener('unload', () => {
  sdk.dispose();
});
```
