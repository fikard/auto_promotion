import type { PlatformType } from '../adapter';

/** 推广渠道 */
export type PromotionChannel = 'product_hunt' | 'reddit' | 'hacker_news' | 'twitter' | 'indie_hackers' | 'seo';

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
