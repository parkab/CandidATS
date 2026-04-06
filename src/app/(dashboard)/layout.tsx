import { getSession } from '@/lib/auth/session';
import Navbar from '@/components/dashboard/navbar';
import { prisma } from '@/lib/prisma';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getSession();

  const dbUser = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      })
    : null;

  // Prefer canonical user fields from Prisma; fall back to session metadata.
  const user = session
    ? {
        name:
          dbUser?.firstName || dbUser?.lastName
            ? `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim()
            : session.firstName || session.lastName
              ? `${session.firstName || ''} ${session.lastName || ''}`.trim()
              : dbUser?.email || session.email,
      }
    : null;

  return (
    <main className="min-h-screen bg-transparent">
      <Navbar user={user} />
      {children}
    </main>
  );
}
