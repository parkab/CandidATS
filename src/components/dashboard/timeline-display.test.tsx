import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineDisplay } from './timeline-display';

jest.mock('@/lib/utils/formatDate', () => ({
  formatDate: (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
}));

describe('TimelineDisplay', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<TimelineDisplay events={[]} isLoading={true} />);
    const skeleton = screen
      .getAllByRole('generic')
      .find((el) => el.className.includes('animate-pulse'));
    expect(skeleton).toBeInTheDocument();
  });

  it('displays "No timeline events yet" when events array is empty', () => {
    render(<TimelineDisplay events={[]} isLoading={false} />);
    expect(screen.getByText('No timeline events yet')).toBeInTheDocument();
  });

  it('renders a single event with all fields', () => {
    const event = {
      id: 'event-1',
      job_id: 'job-1',
      event_type: 'stage_changed',
      notes: 'Moved from Applied to Interview',
      occurred_at: new Date('2026-04-03T10:00:00Z'),
    };

    render(<TimelineDisplay events={[event]} />);

    expect(screen.getByText('Stage Changed')).toBeInTheDocument();
    expect(
      screen.getByText('Moved from Applied to Interview'),
    ).toBeInTheDocument();
    expect(screen.getByText('Apr 3, 2026')).toBeInTheDocument();
  });

  it('renders multiple events in chronological order (newest first)', () => {
    const events = [
      {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: 'Moved to Interview',
        occurred_at: new Date('2026-04-03T10:00:00Z'),
      },
      {
        id: 'event-2',
        job_id: 'job-1',
        event_type: 'job_created',
        notes: null,
        occurred_at: new Date('2026-04-01T08:00:00Z'),
      },
    ];

    render(<TimelineDisplay events={events} />);

    const stage = screen.getByText('Stage Changed');
    const created = screen.getByText('Job Created');

    expect(stage.closest('div')).toBeInTheDocument();
    expect(created.closest('div')).toBeInTheDocument();
    expect(
      stage.compareDocumentPosition(created) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders event without notes correctly', () => {
    const event = {
      id: 'event-1',
      job_id: 'job-1',
      event_type: 'job_created',
      notes: null,
      occurred_at: new Date('2026-04-01T08:00:00Z'),
    };

    render(<TimelineDisplay events={[event]} />);

    expect(screen.getByText('Job Created')).toBeInTheDocument();
    expect(
      screen.queryByText(/^Moved|^Changed|Updated/),
    ).not.toBeInTheDocument();
  });

  it('renders event with unknown event_type using the type as label', () => {
    const event = {
      id: 'event-1',
      job_id: 'job-1',
      event_type: 'custom_event_type',
      notes: 'Custom event',
      occurred_at: new Date('2026-04-03T10:00:00Z'),
    };

    render(<TimelineDisplay events={[event]} />);

    expect(screen.getByText('custom_event_type')).toBeInTheDocument();
    expect(screen.getByText('Custom event')).toBeInTheDocument();
  });

  it('renders "Date unknown" when occurred_at is null', () => {
    const event = {
      id: 'event-1',
      job_id: 'job-1',
      event_type: 'stage_changed',
      notes: 'Test',
      occurred_at: null,
    };

    render(<TimelineDisplay events={[event]} />);

    expect(screen.getByText('Date unknown')).toBeInTheDocument();
  });

  it('applies correct color classes for interview_scheduled event', () => {
    const event = {
      id: 'event-1',
      job_id: 'job-1',
      event_type: 'interview_scheduled',
      notes: null,
      occurred_at: new Date('2026-04-05T10:00:00Z'),
    };

    const { container } = render(<TimelineDisplay events={[event]} />);

    const badge = container.querySelector('.bg-orange-100.text-orange-800');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toContain('Interview Scheduled');
  });

  it('applies default color classes for unknown event types', () => {
    const event = {
      id: 'event-1',
      job_id: 'job-1',
      event_type: 'unknown_type',
      notes: null,
      occurred_at: new Date('2026-04-05T10:00:00Z'),
    };

    const { container } = render(<TimelineDisplay events={[event]} />);

    const badge = container.querySelector('.bg-gray-100.text-gray-800');
    expect(badge).toBeInTheDocument();
  });

  it('renders all known event type labels', () => {
    const eventTypes = [
      'job_created',
      'stage_changed',
      'interview_scheduled',
      'interview_completed',
      'offer_received',
      'follow_up_created',
      'follow_up_completed',
      'note_added',
      'application_submitted',
    ];

    const events = eventTypes.map((type, index) => ({
      id: `event-${index}`,
      job_id: 'job-1',
      event_type: type,
      notes: null,
      occurred_at: new Date('2026-04-05T10:00:00Z'),
    }));

    render(<TimelineDisplay events={events} />);

    expect(screen.getByText('Job Created')).toBeInTheDocument();
    expect(screen.getByText('Stage Changed')).toBeInTheDocument();
    expect(screen.getByText('Interview Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Interview Completed')).toBeInTheDocument();
    expect(screen.getByText('Offer Received')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Created')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Completed')).toBeInTheDocument();
    expect(screen.getByText('Note Added')).toBeInTheDocument();
    expect(screen.getByText('Application Submitted')).toBeInTheDocument();
  });

  it('renders timeline dots and connecting lines for multiple events', () => {
    const events = [
      {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: null,
        occurred_at: new Date('2026-04-03T10:00:00Z'),
      },
      {
        id: 'event-2',
        job_id: 'job-1',
        event_type: 'job_created',
        notes: null,
        occurred_at: new Date('2026-04-01T08:00:00Z'),
      },
    ];

    const { container } = render(<TimelineDisplay events={events} />);

    // Should have 2 timeline dots (one for each event)
    const dots = container.querySelectorAll('.w-3.h-3.rounded-full');
    expect(dots).toHaveLength(2);

    // Should have 1 connecting line (between the two events)
    const lines = container.querySelectorAll('.w-0\\.5.h-12');
    expect(lines).toHaveLength(1);
  });

  it('does not render connecting line for the last event', () => {
    const events = [
      {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'job_created',
        notes: null,
        occurred_at: new Date('2026-04-01T08:00:00Z'),
      },
    ];

    const { container } = render(<TimelineDisplay events={events} />);

    // Should have 1 dot for the single event
    const dots = container.querySelectorAll('.w-3.h-3.rounded-full');
    expect(dots).toHaveLength(1);

    // Should have 0 connecting lines (no next event)
    const lines = container.querySelectorAll('.w-0\\.5.h-12');
    expect(lines).toHaveLength(0);
  });
});
