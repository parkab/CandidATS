import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import ProfilePanel from './profile-panel';
import ExperienceSection from '@/components/profile/ExperienceSection';
import type { ExperienceEntry } from '@/components/profile/ExperienceSection';
import SkillsSection from '@/components/profile/SkillsSection';
import type { SkillEntry } from '@/components/profile/SkillsSection';
import EducationSection from '@/components/profile/EducationSection';
import type { EducationEntry } from '@/components/profile/EducationSection';
import CareerPreferencesSection from '@/components/profile/CareerPreferencesSection';
import type { CareerPreferencesData } from '@/components/profile/CareerPreferencesSection';

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
      Experience: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          type: true,
          title: true,
          organization: true,
          role: true,
          startDate: true,
          endDate: true,
          description: true,
          accomplishments: true,
          sortOrder: true,
        },
      },
      Skill: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          category: true,
          proficiencyLabel: true,
          sortOrder: true,
        },
      },
      Education: {
        orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          institution: true,
          degree: true,
          fieldOfStudy: true,
          startDate: true,
          endDate: true,
          honors: true,
          gpa: true,
        },
      },
      CareerPreferences: {
        select: {
          targetRoles: true,
          targetLocations: true,
          workMode: true,
          salaryPreference: true,
        },
      },
    },
  });

  const userProfile = user?.Profile;

  const initialExperiences: ExperienceEntry[] = (user?.Experience ?? []).map(
    (e): ExperienceEntry => ({
      id: e.id,
      type: e.type,
      title: e.title,
      organization: e.organization,
      role: e.role,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
      description: e.description,
      accomplishments: e.accomplishments,
      sortOrder: e.sortOrder,
    }),
  );

  const initialSkills: SkillEntry[] = (user?.Skill ?? []).map(
    (s): SkillEntry => ({
      id: s.id,
      name: s.name,
      category: s.category,
      proficiencyLabel: s.proficiencyLabel,
      sortOrder: s.sortOrder,
    }),
  );

  const initialEducation: EducationEntry[] = (user?.Education ?? []).map(
    (e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
      honors: e.honors,
      gpa: e.gpa,
    }),
  );

  const initialCareerPreferences: CareerPreferencesData | null =
    user?.CareerPreferences
      ? {
          targetRoles: user.CareerPreferences.targetRoles,
          targetLocations: user.CareerPreferences.targetLocations,
          workMode: user.CareerPreferences.workMode,
          salaryPreference: user.CareerPreferences.salaryPreference,
        }
      : null;

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
      <div className="mx-auto mt-8 w-full max-w-4xl">
        <ExperienceSection initialExperiences={initialExperiences} />
      </div>
      <div className="mx-auto mt-6 w-full max-w-4xl">
        <SkillsSection initialSkills={initialSkills} />
      </div>
      <div className="mx-auto mt-6 w-full max-w-4xl">
        <EducationSection initialEducation={initialEducation} />
      </div>
      <div className="mx-auto mt-6 w-full max-w-4xl">
        <CareerPreferencesSection initialData={initialCareerPreferences} />
      </div>
    </section>
  );
}
