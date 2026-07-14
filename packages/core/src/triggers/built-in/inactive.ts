import type { Trigger } from '../types';

/** 长期未使用激活提醒触发器 */
export function createInactiveReactivate(options?: {
  thresholdDays?: number;
  templateId?: string;
}): Trigger {
  return {
    id: 'inactive_reactivate',
    name: '长期未使用激活提醒',
    condition: {
      type: 'days_inactive',
      params: { thresholdDays: options?.thresholdDays ?? 14 },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: options?.templateId ?? 'reactivation_d1',
        },
      },
    ],
    cooldown: { minDaysBetween: 7, maxTriggers: 3, dailyLimit: 1 },
    enabled: true,
  };
}
