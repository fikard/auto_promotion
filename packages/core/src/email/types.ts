export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  defaultValue?: unknown;
  source: 'product' | 'user' | 'custom';
}

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
