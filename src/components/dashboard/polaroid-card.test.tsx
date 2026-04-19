import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders interactive stage dropdown instead of static badge when jobId and onStageChange are provided', () => {
    const onStageChange = jest.fn().mockResolvedValue(undefined);
    render(
      <PolaroidCard
        company="Stripe"
        location="San Francisco, CA"
        position="Software Engineer"
        lastActivityDate="03.30.2026"
        status="Applied"
        jobId="job-123"
        onStageChange={onStageChange}
      />,
    );

    // The trigger is a <button> containing the current stage text
    const trigger = screen.getByRole('button', { name: /Applied/i });
    expect(trigger).toBeInTheDocument();

    // The static <p> badge (which has the inline background style) should not be rendered
    const badge = screen.queryByText('Applied', { selector: 'p' });
    expect(badge).not.toBeInTheDocument();
  });

  it('opens the stage menu and calls onStageChange when a stage option is selected', async () => {
    const onStageChange = jest.fn().mockResolvedValue(undefined);
    render(
      <PolaroidCard
        company="Stripe"
        location="San Francisco, CA"
        position="Software Engineer"
        lastActivityDate="03.30.2026"
        status="Applied"
        jobId="job-123"
        onStageChange={onStageChange}
      />,
    );

    // Open the dropdown
    const trigger = screen.getByRole('button', { name: /Applied/i });
    fireEvent.click(trigger);

    // The menu should now list all stages
    const interviewOption = await screen.findByRole('button', { name: /Interview/i });
    expect(interviewOption).toBeInTheDocument();

    // Click a different stage
    fireEvent.click(interviewOption);

    await waitFor(() => {
      expect(onStageChange).toHaveBeenCalledWith('Interview');
    });
  });
});
