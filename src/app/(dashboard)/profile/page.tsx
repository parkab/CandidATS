import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import ProfilePanel from './profile-panel';

export default async function Profile() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      Profile: {
        select: {
          phone: true,
          location: true,
          linkedIn: true,
          headline: true,
          bio: true,
        },
      },
    },
  });

  const userProfile = user?.Profile;

  const initialProfile = {
    firstName: user?.firstName ?? session.firstName ?? '',
    lastName: user?.lastName ?? session.lastName ?? '',
    email: user?.email ?? session.email,
    createdAt: user?.createdAt ? user.createdAt.toISOString() : null,
    phone: userProfile?.phone ?? '',
    location: userProfile?.location ?? '',
    linkedIn: userProfile?.linkedIn ?? '',
    headline: userProfile?.headline ?? '',
    bio: userProfile?.bio ?? '',
  };

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Profile</h1>
      </div>

      <ProfilePanel initialProfile={initialProfile} />
    </section>
  );
}
