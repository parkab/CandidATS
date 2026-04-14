import { render, screen } from '@testing-library/react';
import PolaroidCard from '@/components/dashboard/polaroid-card';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';

describe('PolaroidCard', () => {
  it('renders card details and uses status color mapping for badge', () => {
    render(
      <PolaroidCard
        company="Stripe"
        location="San Francisco, CA"
        position="Software Engineer"
        lastActivityDate="03.30.2026"
        status="Applied"
      />,
    );

    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('03.30.2026')).toBeInTheDocument();

    const statusBadge = screen.getByText('Applied');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveStyle({
      backgroundColor: `${APPLICATION_STATUS_COLOR.Applied}8C`,
    });
  });

  it('shows high-priority star when highPriority is true', () => {
    render(
      <PolaroidCard
        company="Stripe"
        location="San Francisco, CA"
        position="Software Engineer"
        lastActivityDate="03.30.2026"
        status="Applied"
        highPriority
      />,
    );

    expect(screen.getByLabelText('High priority')).toBeInTheDocument();
  });

  it('does not show high-priority star when highPriority is false', () => {
    render(
      <PolaroidCard
        company="Stripe"
        location="San Francisco, CA"
        position="Software Engineer"
        lastActivityDate="03.30.2026"
        status="Applied"
        highPriority={false}
      />,
    );

    expect(screen.queryByLabelText('High priority')).not.toBeInTheDocument();
  });
});
