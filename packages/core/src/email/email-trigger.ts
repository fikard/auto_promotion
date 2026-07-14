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
