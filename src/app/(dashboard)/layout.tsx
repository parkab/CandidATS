import Navbar from '@/components/dashboard/navbar';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Replace with real auth user once backend auth integration is ready.
  const mockUser = { name: 'Job Applicant' };

  return (
    // change mock user to null to test logged-out state (login/register buttons)
    <main className="min-h-screen bg-transparent">
      <Navbar user={mockUser} />
      {children}
    </main>
  );
}
