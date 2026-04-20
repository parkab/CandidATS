import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import ProfileContent from './profile-content';
import type { ExperienceEntry } from '@/components/profile/ExperienceSection';
import type { SkillEntry } from '@/components/profile/SkillsSection';
import type { EducationEntry } from '@/components/profile/EducationSection';
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
    <ProfileContent
      initialProfile={initialProfile}
      initialExperiences={initialExperiences}
      initialSkills={initialSkills}
      initialEducation={initialEducation}
      initialCareerPreferences={initialCareerPreferences}
    />
  );
}
