'use client';

import { TimelineEvent } from '@/lib/jobs/job';
import { formatDate } from '@/lib/utils/formatDate';
import { extractNotesContent } from '@/lib/utils/timelineNotes';

export interface TimelineDisplayProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  job_created: 'Job Created',
  stage_changed: 'Stage Changed',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_received: 'Offer Received',
  follow_up_created: 'Follow-up Created',
  follow_up_completed: 'Follow-up Completed',
  note_added: 'Note Added',
  application_submitted: 'Application Submitted',
};

const EVENT_TYPE_COLORS: Record<string, { badge: string; line: string }> = {
  job_created: {
    badge: 'bg-blue-100 text-blue-800',
    line: 'bg-blue-300',
  },
  stage_changed: {
    badge: 'bg-purple-100 text-purple-800',
    line: 'bg-purple-300',
  },
  interview_scheduled: {
    badge: 'bg-orange-100 text-orange-800',
    line: 'bg-orange-300',
  },
  interview_completed: {
    badge: 'bg-green-100 text-green-800',
    line: 'bg-green-300',
  },
  offer_received: {
    badge: 'bg-emerald-100 text-emerald-800',
    line: 'bg-emerald-300',
  },
  follow_up_created: {
    badge: 'bg-cyan-100 text-cyan-800',
    line: 'bg-cyan-300',
  },
  follow_up_completed: {
    badge: 'bg-teal-100 text-teal-800',
    line: 'bg-teal-300',
  },
  note_added: {
    badge: 'bg-gray-100 text-gray-800',
    line: 'bg-gray-300',
  },
  application_submitted: {
    badge: 'bg-indigo-100 text-indigo-800',
    line: 'bg-indigo-300',
  },
};

export function TimelineDisplay({ events, isLoading }: TimelineDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        No timeline events yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline container */}
      <div className="space-y-6 p-4">
        {events.map((event, index) => {
          const colorConfig =
            EVENT_TYPE_COLORS[event.event_type || ''] ||
            EVENT_TYPE_COLORS.note_added;
          const label =
            EVENT_TYPE_LABELS[event.event_type || ''] ||
            event.event_type ||
            'Event';

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline line and dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 border-white ${colorConfig.line}`}
                />
                {index < events.length - 1 && (
                  <div className={`w-0.5 h-12 mt-2 ${colorConfig.line}`} />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorConfig.badge}`}
                    >
                      {label}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {event.occurred_at
                        ? formatDate(new Date(event.occurred_at))
                        : 'Date unknown'}
                    </p>
                  </div>
                </div>
                {event.notes && (
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    {extractNotesContent(event.notes)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
