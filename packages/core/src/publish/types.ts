import type { PromotionChannel, PromotContent } from '../promotion/types';

/** 发布提供商接口 */
export interface PublishProvider {
  /** 提供商名称 */
  name: string;
  /** 支持的渠道 */
  channel: PromotionChannel;
  /** 是否已认证 */
  isAuthenticated(): boolean;
  /** 认证 */
  authenticate(config: Record<string, unknown>): Promise<void>;
  /** 发布内容 */
  publish(content: PromotContent, options?: PublishOptions): Promise<PublishResult>;
}

/** 发布选项 */
export interface PublishOptions {
  /** Reddit：目标 subreddit */
  subreddit?: string;
  /** Discord：目标频道 webhook URL（可覆盖全局配置） */
  webhookUrl?: string;
  /** LinkedIn：作者 URN（可覆盖全局配置） */
  authorUrn?: string;
  /** 定时发布时间 */
  scheduledAt?: Date;
  /** 是否为草稿 */
  draft?: boolean;
  /** 自定义额外参数 */
  extra?: Record<string, unknown>;
}

/** 发布结果 */
export interface PublishResult {
  /** 是否成功 */
  success: boolean;
  /** 渠道 */
  channel: PromotionChannel;
  /** 平台返回的帖子 ID */
  postId?: string;
  /** 帖子 URL */
  url?: string;
  /** 错误信息 */
  error?: string;
  /** 降级类型（如果发生了降级） */
  fallback?: 'clipboard' | 'open_page' | 'none';
}

/** 平台帐号配置 */
export interface PublishChannelConfig {
  /** Discord 配置 */
  discord?: {
    webhookUrl: string;
  };
  /** Reddit 配置 */
  reddit?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    userAgent: string;
    defaultSubreddit?: string;
  };
  /** Twitter/X 配置 */
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    /** 是否使用 Buffer 代理（推荐，节省 X API 费用） */
    useBuffer?: boolean;
    bufferApiKey?: string;
  };
  /** LinkedIn 配置 */
  linkedin?: {
    accessToken: string;
    authorUrn: string;
  };
  /** Product Hunt 配置 */
  productHunt?: {
    developerToken: string;
  };
}
