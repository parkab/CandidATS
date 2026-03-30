import { formatDate } from '@/lib/utils/formatDate';

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const date = new Date('2026-03-15T12:00:00Z');
    expect(formatDate(date)).toBe('2026-03-15');
  });

  it('handles start of year correctly', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(formatDate(date)).toBe('2026-01-01');
  });
});
