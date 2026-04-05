import { getSession } from '@/lib/auth/session';
import Navbar from '@/components/dashboard/navbar';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getSession();

  // Format user name from first and last name if authenticated
  const user = session
    ? {
        name:
          session.firstName || session.lastName
            ? `${session.firstName || ''} ${session.lastName || ''}`.trim()
            : session.email,
      }
    : null;

  return (
    <main className="min-h-screen bg-transparent">
      <Navbar user={user} />
      {children}
    </main>
  );
}
