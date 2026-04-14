# Timeline Feature Implementation

This document describes the timeline feature implementation for tracking job application events.

## Overview

The timeline feature allows job seekers to view a chronological history of events related to their job applications. Events are automatically created when job stages change, and can be manually queried via API.

## API Routes

### GET `/api/jobs/[id]/timeline`

Fetch all timeline events for a specific job.

**Response (200 OK):**
```json
[
  {
    "id": "event-uuid",
    "job_id": "job-uuid",
    "event_type": "stage_changed",
    "notes": "Changed from Applied to Interview",
    "occurred_at": "2026-04-03T10:00:00.000Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication
- `400 Bad Request` - Invalid job ID
- `404 Not Found` - Job does not exist or belongs to another user

### POST `/api/jobs/[id]/timeline`

Create a new timeline event for a specific job.

**Request Body:**
```json
{
  "event_type": "stage_changed",
  "notes": "Optional notes about the event",
  "occurred_at": "2026-04-03T10:00:00Z" // optional, defaults to current time
}
```

**Response (201 Created):**
```json
{
  "id": "event-uuid",
  "job_id": "job-uuid",
  "event_type": "stage_changed",
  "notes": "Changed from Applied to Interview",
  "occurred_at": "2026-04-03T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication
- `400 Bad Request` - Invalid job ID or missing event_type
- `404 Not Found` - Job does not exist or belongs to another user

## Auto-Generated Events

Timeline events are automatically created when:

### Job Stage Changes

When a job's `pipeline_stage` is updated via the PATCH `/api/jobs/[id]` endpoint, a timeline event is automatically created with:
- `event_type`: "stage_changed"
- `notes`: "Changed from {oldStage} to {newStage}"
- `occurred_at`: current timestamp

**Example:**
```javascript
// PATCH /api/jobs/job-123
{
  "title": "Software Engineer",
  "company": "Acme",
  "location": "Remote",
  "stage": "Interview",  // changed from "Applied"
  "lastActivityDate": "2026-04-01"
}

// Automatically creates timeline event:
{
  "event_type": "stage_changed",
  "notes": "Changed from Applied to Interview",
  "occurred_at": "2026-04-03T10:15:00Z"
}
```

## Component: TimelineDisplay

A React component for displaying job timeline events in chronological order.

### Props

```typescript
interface TimelineDisplayProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}
```

### Usage Example

```jsx
import { TimelineDisplay } from '@/components/dashboard/timeline-display';

export function JobDetailPanel() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      const response = await fetch(`/api/jobs/${jobId}/timeline`);
      const data = await response.json();
      setEvents(data);
      setIsLoading(false);
    }

    fetchTimeline();
  }, [jobId]);

  return (
    <div>
      <h3>Timeline</h3>
      <TimelineDisplay events={events} isLoading={isLoading} />
    </div>
  );
}
```

### Supported Event Types

The TimelineDisplay component supports the following event types with specific styling:

- `job_created` - Job Created (blue badge)
- `stage_changed` - Stage Changed (purple badge)
- `interview_scheduled` - Interview Scheduled (orange badge)
- `interview_completed` - Interview Completed (green badge)
- `offer_received` - Offer Received (emerald badge)
- `follow_up_created` - Follow-up Created (cyan badge)
- `follow_up_completed` - Follow-up Completed (teal badge)
- `note_added` - Note Added (gray badge)
- `application_submitted` - Application Submitted (indigo badge)

Unknown event types will render a gray badge with the event type as the label.

### Visual Features

- Chronological display (newest events first)
- Vertical timeline with dots and connecting lines
- Formatted dates using `formatDate()` utility
- Optional notes displayed below event type
- Loading skeleton displayed while fetching
- "No timeline events yet" message when empty

## Helper Functions

### `createTimelineEvent()`

Create a timeline event.

```typescript
import { createTimelineEvent } from '@/lib/jobs/timeline';

// Usage
const event = await createTimelineEvent(
  'job-123',
  'interview_scheduled',
  'Phone interview with Sarah',
  new Date('2026-04-05T14:00:00Z')
);
```

### `createStageChangeEvent()`

Create a stage change event (automatically called by job PATCH route).

```typescript
import { createStageChangeEvent } from '@/lib/jobs/timeline';

// Usage
const event = await createStageChangeEvent(
  'job-123',
  'Applied',  // old stage
  'Interview' // new stage
);

// Returns null if stages are the same
```

## Database Schema

Timeline events are stored in the `TimelineEvent` table:

```prisma
model TimelineEvent {
  id         String   @id @default(cuid())
  job_id     String
  job        Job      @relation(fields: [job_id], references: [id], onDelete: Cascade)
  event_type String?
  notes      String?
  occurred_at DateTime? @db.Timestamp(6)
}
```

## Testing

All timeline functionality includes comprehensive test coverage:

- **API Routes**: [/src/app/api/jobs/[id]/timeline/route.test.ts](/src/app/api/jobs/[id]/timeline/route.test.ts)
- **Component**: [/src/components/dashboard/timeline-display.test.tsx](/src/components/dashboard/timeline-display.test.tsx)
- **Helpers**: [/src/lib/jobs/timeline.test.ts](/src/lib/jobs/timeline.test.ts)
- **PATCH Integration**: Updated tests in [/src/app/api/jobs/[id]/route.test.ts](/src/app/api/jobs/[id]/route.test.ts)

Run tests with:
```bash
npm test
```

## Future Enhancements

Potential additions for future phases:

1. Auto-create timeline events for interview operations
2. Auto-create timeline events for follow-up completion
3. Timeline event filtering and search
4. Timeline event export (PDF/CSV)
5. Custom event type creation by users
6. Timeline event bulk operations
7. Audit trail for event modifications
8. Email notifications on timeline events
