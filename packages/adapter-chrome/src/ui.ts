import type { RatingPromptConfig, RatingAction, NotificationConfig, ShareConfig } from '@growth-sdk/core';

/** 自定义 UI 渲染器 */
export interface UIRenderer {
  renderRatingPrompt?(config: RatingPromptConfig, container: HTMLElement): Promise<RatingAction>;
  renderNotification?(config: NotificationConfig, container: HTMLElement): Promise<void>;
  renderShareDialog?(config: ShareConfig, container: HTMLElement): Promise<void>;
}

export interface ChromeUIOptions {
  renderer?: UIRenderer;
}

export class ChromeUI {
  private renderer?: UIRenderer;

  constructor(options?: ChromeUIOptions) {
    this.renderer = options?.renderer;
  }

  async showRatingPrompt(config: RatingPromptConfig): Promise<RatingAction> {
    // 如果有自定义渲染器，优先使用
    if (this.renderer?.renderRatingPrompt) {
      const container = document.body;
      return this.renderer.renderRatingPrompt(config, container);
    }

    return new Promise((resolve) => {
      const overlay = this.createOverlay();
      const dialog = this.createDialog();

      dialog.innerHTML = `
        <div style="text-align:center;padding:24px;">
          <h3 style="margin:0 0 8px;font-size:18px;">${config.title}</h3>
          <p style="margin:0 0 20px;color:#666;font-size:14px;">${config.message}</p>
          <div style="display:flex;gap:12px;justify-content:center;">
            ${config.options.map(opt => `
              <button data-action="${opt.action}" style="
                padding:10px 20px;border:1px solid #ddd;border-radius:8px;cursor:pointer;
                font-size:14px;background:white;
              ">${opt.emoji} ${opt.label}</button>
            `).join('')}
          </div>
        </div>
      `;

      dialog.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('button');
        if (button) {
          const action = button.dataset.action as RatingAction['type'];
          this.removeOverlay(overlay);
          resolve({ type: action });
        }
      });

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  async showNotification(config: NotificationConfig): Promise<void> {
    // 如果有自定义渲染器，优先使用
    if (this.renderer?.renderNotification) {
      const container = document.body;
      return this.renderer.renderNotification(config, container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:16px;right:16px;z-index:2147483647;
      padding:16px 24px;border-radius:8px;background:#1a1a2e;color:#fff;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;max-width:360px;
      transition:opacity 0.3s;opacity:1;
    `;
    toast.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">${config.title}</div>
      <div style="opacity:0.8;">${config.message}</div>
      ${config.cta ? `<a href="${config.cta.url}" target="_blank" style="color:#4ade80;text-decoration:none;font-weight:600;margin-top:8px;display:inline-block;">${config.cta.label}</a>` : ''}
    `;
    document.body.appendChild(toast);

    const duration = config.duration ?? 5000;
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async showShareDialog(config: ShareConfig): Promise<void> {
    // 如果有自定义渲染器，优先使用
    if (this.renderer?.renderShareDialog) {
      const container = document.body;
      return this.renderer.renderShareDialog(config, container);
    }

    const shareUrl = new URL('https://twitter.com/intent/tweet');
    shareUrl.searchParams.set('text', `${config.title}\n${config.text}`);
    shareUrl.searchParams.set('url', config.url);
    window.open(shareUrl.toString(), '_blank', 'width=600,height=400');
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
    return overlay;
  }

  private createDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);min-width:320px;max-width:420px;';
    return dialog;
  }

  private removeOverlay(overlay: HTMLElement): void {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';
    setTimeout(() => overlay.remove(), 200);
  }
}
