/**
 * Growth SDK 核心功能本地演示
 *
 * 用 mock 数据模拟完整用户旅程，覆盖所有核心模块：
 * 1. SDK 初始化与销毁
 * 2. 触发器引擎（内置 + 自定义 + AND/OR 组合条件）
 * 3. 模板引擎（多语言 + A/B 测试）
 * 4. 推广策略（8 渠道文案生成 + UTM 归因 + 效果反馈闭环）
 * 5. 事件追踪（离线队列 + 重试）
 * 6. 隐私合规（consent + 匿名模式 + 脱敏）
 * 7. Feature Flags（boolean + percentage + variant + 规则）
 * 8. A/B 测试统计引擎（Z 检验 + 最小样本量）
 *
 * 运行：npx tsx demo.ts
 */

import { GrowthSDK } from './packages/core/src/engine';
import type { PlatformAdapter, AnalyticsProvider, AnalyticsEvent } from './packages/core/src/adapter';
import type { Trigger, CompositeCondition, TriggerCondition } from './packages/core/src/triggers/types';
import type { GrowthTemplate } from './packages/core/src/templates/types';
import type { PromotionChannel } from './packages/core/src/promotion/types';
import type { PromotionFeedback } from './packages/core/src/promotion/feedback';
import type { FeatureFlag, FlagContext } from './packages/core/src/feature-flags/types';
import { AttributionTracker } from './packages/core/src/promotion/attribution';
import { ExperimentStats } from './packages/core/src/templates/statistics';
import type { VariantStats } from './packages/core/src/templates/statistics';

// ══════════════════════════════════════════════════════════
// Mock 基础设施
// ══════════════════════════════════════════════════════════

/** 内存存储 */
class MemoryStore {
  private data = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null;
  }
  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

/** Mock PlatformAdapter */
function createAdapter(platform: string = 'chrome'): PlatformAdapter {
  const store = new MemoryStore();
  return {
    storage: store,
    ui: {
      showRatingPrompt: async (config) => {
        console.log(`  [UI] 评分弹窗: "${config.title}" — ${config.options.map(o => o.label).join(', ')}`);
        return { type: 'open_store' };
      },
      showNotification: async (config) => {
        console.log(`  [UI] 通知: [${config.type}] ${config.title} — ${config.message}`);
      },
      showShareDialog: async (config) => {
        console.log(`  [UI] 分享: ${config.title} — ${config.url}`);
      },
    },
    links: {
      openStorePage: () => console.log('  [Link] 打开商店页面'),
      openShareUrl: (url: string) => console.log(`  [Link] 分享 URL: ${url}`),
      getStoreUrl: () => 'https://chrome.google.com/webstore/detail/pagelens-abc123',
    },
    device: {
      getPlatform: () => platform as any,
      getVersion: () => '1.2.0',
      getLocale: () => 'en',
    },
  };
}

/** Mock AnalyticsProvider — 记录所有事件并打印 */
function createAnalyticsProvider(): { provider: AnalyticsProvider; events: AnalyticsEvent[] } {
  const events: AnalyticsEvent[] = [];
  return {
    provider: {
      name: 'mock-analytics',
      init: () => {},
      track: (event: AnalyticsEvent) => {
        events.push(event);
        console.log(`  [Analytics] ${event.name}`, event.properties ?? '');
      },
      identify: (userId: string, traits?: Record<string, unknown>) => {
        console.log(`  [Analytics] identify: ${userId}`, traits ?? '');
      },
    },
    events,
  };
}

// ══════════════════════════════════════════════════════════
// Mock 数据
// ══════════════════════════════════════════════════════════

const PRODUCT = {
  name: 'PageLens',
  tagline: 'Free AI Web Summarizer with On-Device AI',
  version: '1.2.0',
  storeUrl: 'https://chrome.google.com/webstore/detail/pagelens-abc123',
  supportUrl: 'https://github.com/fikard/web_plugins/issues',
  locale: 'en',
};

/** 自定义触发器：重度用户评分 */
const POWER_USER_TRIGGER: Trigger = {
  id: 'power_user_rating',
  name: '重度用户评分提示',
  condition: {
    operator: 'and',
    conditions: [
      { type: 'usage_count', params: { sessionCount: 5 } },
      { type: 'custom', params: { eventType: 'pro_feature_used' } },
    ],
  } as CompositeCondition,
  actions: [
    { type: 'show_rating', config: { title: 'Love PageLens?', message: 'Your feedback matters!', storeUrl: PRODUCT.storeUrl } },
    { type: 'show_notification', config: { title: 'You are a power user!', message: 'Thanks for using PageLens extensively.', type: 'celebration' as const } },
  ],
  cooldown: { minDaysBetween: 30, maxTriggers: 3, dailyLimit: 1 },
  enabled: true,
};

/** 自定义触发器：OR 条件 — 任意里程碑触发 */
const MILESTONE_TRIGGER: Trigger = {
  id: 'milestone_celebration',
  name: '里程碑庆祝',
  condition: {
    operator: 'or',
    conditions: [
      { type: 'milestone', params: { milestoneType: '100_summaries' } },
      { type: 'milestone', params: { milestoneType: 'first_share' } },
      { type: 'payment', params: {} },
    ],
  } as CompositeCondition,
  actions: [
    { type: 'show_notification', config: { title: 'Milestone Reached!', message: 'You have achieved something great!', type: 'celebration' as const } },
  ],
  cooldown: { minDaysBetween: 7, maxTriggers: 10, dailyLimit: 2 },
  enabled: true,
};

/** 多语言推广模板 */
const LAUNCH_TEMPLATE: GrowthTemplate = {
  id: 'product_launch',
  type: 'promotion',
  name: '产品发布推广',
  locales: {
    en: {
      title: 'Introducing {productName} — {tagline}',
      body: 'We just launched {productName}! {coreBenefit}. Try it free: {storeUrl}',
      cta: 'Try it free',
      tags: ['launch', 'productivity'],
    },
    zh: {
      title: '隆重介绍 {productName} — {tagline}',
      body: '{productName} 正式发布！{coreBenefit}。免费试用：{storeUrl}',
      cta: '免费试用',
      tags: ['发布', '效率工具'],
    },
    ja: {
      title: '{productName} をご紹介 — {tagline}',
      body: '{productName} をローンチしました！{coreBenefit}。無料でお試しください：{storeUrl}',
      cta: '無料で試す',
      tags: ['ローンチ', '生産性'],
    },
  },
  variables: [
    { name: 'productName', type: 'string', required: true, source: 'product' },
    { name: 'tagline', type: 'string', required: true, source: 'product' },
    { name: 'coreBenefit', type: 'string', required: false, source: 'custom', defaultValue: 'AI-powered summaries in your browser' },
    { name: 'storeUrl', type: 'url', required: true, source: 'product' },
  ],
  variants: [
    { id: 'formal', name: '正式风格', weight: 50, content: { body: 'We are pleased to announce {productName}! {coreBenefit}.', cta: 'Learn more' } },
    { id: 'casual', name: '轻松风格', weight: 50, content: { body: 'Hey! Check out {productName} — {coreBenefit}. 🚀', cta: 'Check it out' } },
  ],
  platforms: ['chrome', 'vscode', 'shopify'],
};

/** Feature Flags 配置 */
const FLAGS: FeatureFlag[] = [
  {
    key: 'new_summarization_ui',
    type: 'boolean',
    enabled: true,
    defaultValue: false,
  },
  {
    key: 'beta_export_pdf',
    type: 'percentage',
    enabled: true,
    defaultValue: false,
    percentage: 30,
  },
  {
    key: 'onboarding_flow',
    type: 'variant',
    enabled: true,
    defaultValue: 'classic',
    variants: [
      { name: 'classic', weight: 60 },
      { name: 'simplified', weight: 40 },
    ],
  },
  {
    key: 'advanced_analytics',
    type: 'boolean',
    enabled: true,
    defaultValue: false,
    rules: [
      { field: 'platform', operator: 'eq', value: 'chrome' },
      { field: 'locale', operator: 'in', value: ['en', 'zh'] },
    ],
  },
];

// ══════════════════════════════════════════════════════════
// 演示主流程
// ══════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       Growth SDK 核心功能本地演示                 ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const adapter = createAdapter('chrome');
  const { provider: analyticsProvider, events } = createAnalyticsProvider();

  // ── 1. SDK 初始化 ──────────────────────────────────────
  console.log('━━━ 1. SDK 初始化 ━━━');

  const sdk = new GrowthSDK({
    adapter,
    product: PRODUCT,
    analytics: { provider: analyticsProvider },
    privacy: {
      defaultConsent: 'granted',
      anonymousMode: false,
      sensitiveFields: ['email', 'phone', 'ip'],
    },
    featureFlags: {
      context: { platform: 'chrome', locale: 'en', userId: 'demo-user-001' },
    },
    triggers: {
      second_session_rating: { enabled: true },
      usage_count_rating: { enabled: true },
      inactive_reactivate: { enabled: false }, // 演示中关闭
    },
  });

  await sdk.init();
  console.log('  SDK 初始化完成\n');

  // ── 2. Feature Flags ──────────────────────────────────
  console.log('━━━ 2. Feature Flags ━━━');

  // 注册 Flag
  for (const flag of FLAGS) {
    sdk.flags.register(flag);
  }

  // 评估 Flag
  const flagResults = sdk.flags.evaluateAll();
  for (const [key, result] of Object.entries(flagResults)) {
    console.log(`  ${key}: value=${JSON.stringify(result.value)}, reason=${result.reason}`);
  }

  // 规则匹配测试：chrome + en 应命中 advanced_analytics
  const advResult = sdk.flags.evaluate('advanced_analytics', { platform: 'chrome', locale: 'en' });
  console.log(`  advanced_analytics (chrome/en): ${advResult.value} (${advResult.reason})`);
  const advResultNoMatch = sdk.flags.evaluate('advanced_analytics', { platform: 'vscode', locale: 'ja' });
  console.log(`  advanced_analytics (vscode/ja): ${advResultNoMatch.value} (${advResultNoMatch.reason})`);
  console.log();

  // ── 3. 隐私合规 ──────────────────────────────────────
  console.log('━━━ 3. 隐私合规 ━━━');

  console.log(`  当前 consent: ${sdk.privacy.isGranted() ? 'granted' : 'not granted'}`);

  // 测试匿名模式
  sdk.privacy.setAnonymousMode(true);
  sdk.analytics.track('test_anonymous_event', { email: 'user@example.com', action: 'test' });
  console.log('  匿名模式: userId 已移除，email 已脱敏（查看上方事件输出）');

  sdk.privacy.setAnonymousMode(false);

  // 测试拒绝同意
  sdk.privacy.deny();
  sdk.analytics.track('should_not_send', { reason: 'denied' });
  console.log('  consent=denied: 事件被阻止发送（上方无 Analytics 输出即验证成功）');

  sdk.privacy.grant();
  console.log('  consent 已恢复为 granted\n');

  // ── 4. 触发器引擎 ─────────────────────────────────────
  console.log('━━━ 4. 触发器引擎 ━━━');

  // 注册自定义触发器
  sdk.triggers.register(POWER_USER_TRIGGER);
  sdk.triggers.register(MILESTONE_TRIGGER);
  console.log('  注册了 2 个自定义触发器 (AND/OR 组合条件)');

  // 模拟用户旅程
  console.log('\n  模拟用户旅程:');

  // 第 2 次会话 → 内置 second_session_rating 触发
  console.log('  → 第 2 次打开');
  await sdk.triggers.evaluate({ type: 'session_start' });

  // 使用 pro 功能 → 不满足 AND 条件（session 不足 5 次）
  console.log('  → 使用 pro 功能（session=2，不足 5 次，不触发）');
  await sdk.triggers.evaluate({ type: 'pro_feature_used' });

  // 模拟再打开 3 次（达到 session=5）→ 再使用 pro 功能 → 触发 AND 条件
  console.log('  → 继续使用 3 次后（session=5），使用 pro 功能 → 触发 AND 条件');
  for (let i = 0; i < 3; i++) {
    await sdk.triggers.evaluate({ type: 'session_start' });
  }
  await sdk.triggers.evaluate({ type: 'pro_feature_used' });

  // 里程碑 OR 条件测试
  console.log('  → 达成 100_summaries 里程碑 → 触发 OR 条件');
  await sdk.triggers.evaluate({ type: 'milestone_reached', properties: { milestoneType: '100_summaries' } });

  // 支付事件也触发 OR 条件
  console.log('  → 完成支付 → 也触发 OR 条件');
  await sdk.triggers.evaluate({ type: 'payment_completed' });

  console.log(`  触发历史: ${sdk.triggers.getHistory().length} 条记录\n`);

  // ── 5. 模板引擎 ───────────────────────────────────────
  console.log('━━━ 5. 模板引擎 ━━━');

  sdk.templates.register(LAUNCH_TEMPLATE);
  console.log('  注册了多语言推广模板 (en/zh/ja + A/B 变体)');

  // 英文渲染
  const enContent = sdk.templates.render('product_launch', { locale: 'en' });
  console.log(`\n  [EN] ${enContent.title}`);
  console.log(`       ${enContent.body}`);
  console.log(`       CTA: ${enContent.cta} | variant: ${enContent.variantId ?? 'default'}`);

  // 中文渲染
  const zhContent = sdk.templates.render('product_launch', { locale: 'zh' });
  console.log(`\n  [ZH] ${zhContent.title}`);
  console.log(`       ${zhContent.body}`);
  console.log(`       CTA: ${zhContent.cta}`);

  // 日文渲染
  const jaContent = sdk.templates.render('product_launch', { locale: 'ja' });
  console.log(`\n  [JA] ${jaContent.title}`);
  console.log(`       ${jaContent.body}`);
  console.log(`       CTA: ${jaContent.cta}`);

  // 回退测试（请求不存在的语言 → 回退到 en）
  const fallback = sdk.templates.render('product_launch', { locale: 'ko' });
  console.log(`\n  [KO→fallback] locale=${fallback.locale}, title=${fallback.title?.slice(0, 30)}...`);
  console.log();

  // ── 6. 推广策略 ───────────────────────────────────────
  console.log('━━━ 6. 推广策略（8 渠道 + UTM 归因 + 反馈闭环）━━━');

  const channels: PromotionChannel[] = ['product_hunt', 'reddit', 'hacker_news', 'twitter', 'discord', 'linkedin', 'indie_hackers', 'seo'];

  for (const channel of channels) {
    const content = sdk.promotion.generate(channel);
    console.log(`\n  [${channel}] ${content.title}`);
    console.log(`    CTA: ${content.cta ?? 'N/A'} | Tags: ${content.tags.join(', ')}`);
    console.log(`    URL: ${content.url ?? 'N/A'}`);
  }

  // 推广反馈闭环
  console.log('\n  推广反馈闭环:');

  // 模拟 Product Hunt 推广效果
  await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'viewed' });
  await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'viewed' });
  await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'clicked' });
  await sdk.promotion.trackFeedback({ channel: 'product_hunt', event: 'converted' });

  // 模拟 Reddit 推广效果
  await sdk.promotion.trackFeedback({ channel: 'reddit', event: 'viewed' });
  await sdk.promotion.trackFeedback({ channel: 'reddit', event: 'viewed' });
  await sdk.promotion.trackFeedback({ channel: 'reddit', event: 'viewed' });
  await sdk.promotion.trackFeedback({ channel: 'reddit', event: 'clicked' });

  // 模拟 HN 推广效果
  await sdk.promotion.trackFeedback({ channel: 'hacker_news', event: 'viewed' });
  await sdk.promotion.trackFeedback({ channel: 'hacker_news', event: 'clicked' });
  await sdk.promotion.trackFeedback({ channel: 'hacker_news', event: 'converted' });
  await sdk.promotion.trackFeedback({ channel: 'hacker_news', event: 'converted' });

  const performance = sdk.promotion.getPerformance();
  console.log('\n  渠道效果统计:');
  for (const perf of performance) {
    console.log(`    ${perf.channel}: views=${perf.views}, clicks=${perf.clicks}, conversions=${perf.conversions}, clickRate=${(perf.clickRate * 100).toFixed(1)}%, conversionRate=${(perf.conversionRate * 100).toFixed(1)}%`);
  }

  const recommended = sdk.promotion.getRecommendedChannels();
  console.log(`\n  推荐渠道排序: ${recommended.map(r => `${r.channel}(${(r.conversionRate * 100).toFixed(0)}%)`).join(' → ')}`);

  // 推荐策略（含反馈权重排序）
  const strategies = sdk.promotion.getRecommendedStrategies();
  console.log(`  策略推荐顺序: ${strategies.map(s => s.channel).join(' → ')}`);
  console.log();

  // ── 7. UTM 归因 ───────────────────────────────────────
  console.log('━━━ 7. UTM 归因追踪 ━━━');

  // 解析 UTM
  const parsedUTM = AttributionTracker.parseUTM('https://example.com?utm_source=reddit&utm_medium=social&utm_campaign=v2_launch');
  console.log(`  解析 UTM: ${JSON.stringify(parsedUTM)}`);

  // 渠道标准 UTM
  for (const ch of ['product_hunt', 'reddit', 'discord'] as PromotionChannel[]) {
    const utm = AttributionTracker.channelUTM(ch, 'v2_launch');
    console.log(`  ${ch} UTM: source=${utm.utm_source}, medium=${utm.utm_medium}, campaign=${utm.utm_campaign}`);
  }
  console.log();

  // ── 8. A/B 测试统计引擎 ───────────────────────────────
  console.log('━━━ 8. A/B 测试统计引擎 ━━━');

  const control: VariantStats = { variantId: 'control', samples: 1200, conversions: 120, conversionRate: 0.1 };
  const treatment: VariantStats = { variantId: 'treatment', samples: 1200, conversions: 168, conversionRate: 0.14 };

  console.log(`  Control: ${control.conversions}/${control.samples} = ${(control.conversionRate * 100).toFixed(1)}%`);
  console.log(`  Treatment: ${treatment.conversions}/${treatment.samples} = ${(treatment.conversionRate * 100).toFixed(1)}%`);

  // Z 检验
  const zResult = ExperimentStats.zTest(control, treatment);
  console.log(`  Z 检验: zScore=${zResult.zScore.toFixed(4)}, pValue=${zResult.pValue.toFixed(6)}`);

  // 最小样本量
  const minSamples = ExperimentStats.minimumSampleSize(0.1, 0.4, 0.05, 0.8);
  console.log(`  最小样本量 (baseline=10%, MDE=40%): ${minSamples} 每组`);

  // 完整实验分析
  const analysis = ExperimentStats.analyze('landing_page_test', [control, treatment]);
  console.log(`  实验分析: significant=${analysis.isSignificant}, winner=${analysis.winner ?? 'none'}, confidence=${(analysis.confidence * 100).toFixed(1)}%, pValue=${analysis.pValue.toFixed(6)}`);
  console.log();

  // ── 9. 事件追踪总览 ───────────────────────────────────
  console.log('━━━ 9. 事件追踪总览 ━━━');

  sdk.analytics.track('demo_complete', { duration: '5s', modules_tested: 8 });
  sdk.analytics.identify('demo-user-001', { plan: 'pro', signupDate: '2026-07-15' });

  console.log(`  总事件数: ${events.length}`);
  const eventNames = [...new Set(events.map(e => e.name))];
  console.log(`  事件类型: ${eventNames.join(', ')}`);
  console.log();

  // ── 10. SDK 销毁 ──────────────────────────────────────
  console.log('━━━ 10. SDK 销毁（持久化状态）━━━');

  await sdk.dispose();
  console.log('  SDK 已销毁，trigger 状态已保存，analytics 队列已刷新');
  console.log();

  // ═══════════════════════════════════════════════════════
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           全部核心功能演示完成 ✓                   ║');
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch(console.error);
