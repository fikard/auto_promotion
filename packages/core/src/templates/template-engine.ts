import type { PlatformAdapter, ProductConfig } from '../adapter';
import type { GrowthTemplate, RenderOptions, RenderedContent, LocaleContent, TemplateVariant } from './types';
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

    const requestedLocale = options.locale ?? this.productConfig.locale ?? 'en';
    const { locale, content } = this.resolveLocale(template, requestedLocale);

    let finalContent = content;
    if (template.variants && template.variants.length > 0) {
      const variantId = options.variantId ?? this.abTest.assignments[id];
      if (variantId) {
        const variant = template.variants.find(v => v.id === variantId);
        if (variant) finalContent = { ...content, ...variant.content };
      }
    }

    const customVars = options.variables ?? {};
    this.resolver.validate(customVars, template.variables);

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

  async getVariant(templateId: string): Promise<TemplateVariant | null> {
    const template = this.templates.get(templateId);
    if (!template?.variants) return null;
    return this.abTest.getVariant(templateId, template.variants);
  }

  private resolveLocale(template: GrowthTemplate, locale: string): { locale: string; content: LocaleContent } {
    if (template.locales[locale]) return { locale, content: template.locales[locale] };
    if (template.locales['en']) return { locale: 'en', content: template.locales['en'] };
    const firstLocale = Object.keys(template.locales)[0];
    if (firstLocale) return { locale: firstLocale, content: template.locales[firstLocale] };
    throw new Error(`Template has no locales: ${template.id}`);
  }
}
