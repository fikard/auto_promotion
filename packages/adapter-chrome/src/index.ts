import type { PlatformAdapter } from '@growth-sdk/core';
import { ChromeStorage } from './storage';
import { ChromeUI } from './ui';
import { ChromeLinks } from './links';

declare const chrome: {
  runtime: {
    getManifest(): { version: string };
  };
};

export interface ChromeAdapterOptions {
  storeUrl: string;
}

export class ChromeAdapter implements PlatformAdapter {
  storage: PlatformAdapter['storage'];
  ui: PlatformAdapter['ui'];
  links: PlatformAdapter['links'];
  device: PlatformAdapter['device'];

  constructor(options: ChromeAdapterOptions) {
    this.storage = new ChromeStorage();
    this.ui = new ChromeUI();
    this.links = new ChromeLinks(options.storeUrl);
    this.device = {
      getPlatform: () => 'chrome' as const,
      getVersion: () => chrome.runtime.getManifest().version,
      getLocale: () => navigator.language.split('-')[0] ?? 'en',
    };
  }
}

export { ChromeStorage } from './storage';
export { ChromeUI } from './ui';
export { ChromeLinks } from './links';
