import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import Navbar from '@/components/dashboard/navbar';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Format user name from first and last name
  const userName =
    session.firstName || session.lastName
      ? `${session.firstName || ''} ${session.lastName || ''}`.trim()
      : session.email;

  return (
    <main className="min-h-screen bg-transparent">
      <Navbar user={{ name: userName }} />
      {children}
    </main>
  );
}
