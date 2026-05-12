'use client';

import type { PropsWithChildren } from 'react';

export type ProfileCompletionData = {
  percentage: number;
  completed: number;
  total: number;
};

type ProfileCompletionBarProps = PropsWithChildren<{
  completionData: ProfileCompletionData;
}>;

export function ProfileCompletionBar({
  completionData,
}: ProfileCompletionBarProps) {
  return (
    <div className="rounded-lg border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
      <div className="grid gap-5">
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-(--foreground)">
              Profile completion
            </p>
            <p className="text-sm font-semibold text-(--foreground)">
              {completionData.percentage}% complete
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionData.percentage}
            className="h-2 overflow-hidden rounded-full bg-(--action-bg)"
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)] transition-[width] duration-500"
              style={{ width: `${completionData.percentage}%` }}
            />
          </div>
          <p className="text-xs font-medium text-(--text-muted)">
            {completionData.completed} of {completionData.total} profile fields
            complete
          </p>
        </div>
      </div>
    </div>
  );
}
