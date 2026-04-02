import Navbar from '@/components/dashboard/navbar';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Replace with real auth user once backend auth integration is ready.
  // ADD MOCK_USER=true to .env.local to test logged-in state (user name in navbar, access profile/settings/documents pages)
  const useMockUser = process.env.MOCK_USER === 'true';
  const mockUser = useMockUser ? { name: 'Job Applicant' } : null;

  return (
    // Set MOCK_USER=false or remove it from .env.local to test logged-out state (login/register buttons)
    <main className="min-h-screen bg-transparent">
      <Navbar user={mockUser} />
      {children}
    </main>
  );
}
