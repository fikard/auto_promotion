declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  };
  runtime: {
    getManifest(): { version: string };
  };
};

const STORAGE_PREFIX = 'growth_sdk_';

export class ChromeStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(`${STORAGE_PREFIX}${key}`);
    const value = result[`${STORAGE_PREFIX}${key}`];
    return value !== undefined ? (value as T) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [`${STORAGE_PREFIX}${key}`]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(`${STORAGE_PREFIX}${key}`);
  }
}
