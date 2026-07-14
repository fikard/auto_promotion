import type { Trigger } from '../types';

/** 第二次会话评分触发器 */
export function createSecondSessionRating(options?: {
  session?: number;
  delayMs?: number;
}): Trigger {
  return {
    id: 'second_session_rating',
    name: '第二次使用评分请求',
    condition: { type: 'usage_count', params: { sessionCount: options?.session ?? 2 } },
    actions: [
      {
        type: 'show_rating',
        config: {
          delayMs: options?.delayMs ?? 3000,
          title: 'Enjoying {productName}?',
          message: 'A review helps others discover {productName}. It only takes 30 seconds!',
          options: [
            { emoji: '😊', label: 'Love it!', action: 'open_store' },
            { emoji: '😐', label: "It's okay", action: 'show_feedback' },
          ],
        },
      },
    ],
    cooldown: { minDaysBetween: 90, maxTriggers: 1, dailyLimit: 1 },
    enabled: true,
  };
}

/** 使用次数评分触发器 */
export function createUsageCountRating(options?: {
  count?: number;
  cooldownDays?: number;
}): Trigger {
  return {
    id: 'usage_count_rating',
    name: '使用次数评分请求',
    condition: { type: 'usage_count', params: { sessionCount: options?.count ?? 5 } },
    actions: [{ type: 'show_rating', config: {} }],
    cooldown: { minDaysBetween: options?.cooldownDays ?? 90, maxTriggers: 2, dailyLimit: 1 },
    enabled: true,
  };
}
