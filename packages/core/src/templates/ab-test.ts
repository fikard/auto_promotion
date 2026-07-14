import type { PlatformAdapter } from '../adapter';
import type { TemplateVariant } from './types';

const AB_STORAGE_KEY = 'growth_sdk_ab_assignments';

export class ABTestAllocator {
  assignments: Record<string, string> = {};

  constructor(private adapter: PlatformAdapter) {}

  async load(): Promise<void> {
    const saved = await this.adapter.storage.get<Record<string, string>>(AB_STORAGE_KEY);
    if (saved) this.assignments = saved;
  }

  async getVariant(templateId: string, variants: TemplateVariant[]): Promise<TemplateVariant | null> {
    if (!variants || variants.length === 0) return null;

    if (this.assignments[templateId]) {
      const existing = variants.find(v => v.id === this.assignments[templateId]);
      if (existing) return existing;
    }

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

    const fallback = variants[0];
    this.assignments[templateId] = fallback.id;
    await this.adapter.storage.set(AB_STORAGE_KEY, this.assignments);
    return fallback;
  }

  setVariant(templateId: string, variantId: string): void {
    this.assignments[templateId] = variantId;
  }
}
