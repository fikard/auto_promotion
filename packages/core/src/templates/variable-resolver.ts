import type { TemplateVariable } from './types';

export class VariableResolver {
  constructor(
    private productVars: Record<string, unknown>,
    private userVars: Record<string, unknown> = {},
  ) {}

  resolve(template: string, customVars: Record<string, unknown>, variables: TemplateVariable[]): string {
    return template.replace(/\{(\w+)\}/g, (match, varName) => {
      const value = customVars[varName] ?? this.userVars[varName] ?? this.productVars[varName];
      if (value !== undefined) return String(value);

      const varDef = variables.find(v => v.name === varName);
      if (varDef?.defaultValue !== undefined) return String(varDef.defaultValue);

      return match;
    });
  }

  validate(customVars: Record<string, unknown>, variables: TemplateVariable[]): void {
    const missing = variables
      .filter(v => v.required)
      .filter(v => customVars[v.name] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.map(v => v.name).join(', ')}`);
    }
  }
}
