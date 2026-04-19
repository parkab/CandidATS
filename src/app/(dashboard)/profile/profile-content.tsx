'use client';

import { useMemo, useState } from 'react';
import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import ProfilePanel from './profile-panel';
import ExperienceSection from '@/components/profile/ExperienceSection';
import type { ExperienceEntry } from '@/components/profile/ExperienceSection';
import SkillsSection from '@/components/profile/SkillsSection';
import type { SkillEntry } from '@/components/profile/SkillsSection';
import EducationSection from '@/components/profile/EducationSection';
import type { EducationEntry } from '@/components/profile/EducationSection';
import CareerPreferencesSection from '@/components/profile/CareerPreferencesSection';
import type { CareerPreferencesData } from '@/components/profile/CareerPreferencesSection';

type ProfileContentProps = {
  initialProfile: {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string | null;
    phone: string;
    location: string;
    linkedIn: string;
    headline: string;
    bio: string;
  };
  initialExperiences: ExperienceEntry[];
  initialSkills: SkillEntry[];
  initialEducation: EducationEntry[];
  initialCareerPreferences: CareerPreferencesData | null;
};

function hasCareerPreferences(data: CareerPreferencesData | null): boolean {
  if (!data) {
    return false;
  }

  return Boolean(
    data.targetRoles?.trim() ||
    data.targetLocations?.trim() ||
    data.workMode?.trim() ||
    data.salaryPreference?.trim(),
  );
}

export default function ProfileContent({
  initialProfile,
  initialExperiences,
  initialSkills,
  initialEducation,
  initialCareerPreferences,
}: ProfileContentProps) {
  const [hasExperience, setHasExperience] = useState(
    initialExperiences.length > 0,
  );
  const [hasSkills, setHasSkills] = useState(initialSkills.length > 0);
  const [hasEducation, setHasEducation] = useState(initialEducation.length > 0);
  const [hasCareerPreferencesState, setHasCareerPreferencesState] = useState(
    hasCareerPreferences(initialCareerPreferences),
  );

  const profilePanelProps = useMemo(
    () => ({
      hasExperience,
      hasSkills,
      hasEducation,
      hasCareerPreferences: hasCareerPreferencesState,
    }),
    [hasCareerPreferencesState, hasEducation, hasExperience, hasSkills],
  );

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Profile</h1>
      </div>

      <ProfilePanel initialProfile={initialProfile} {...profilePanelProps} />
      <div className="mx-auto mt-8 w-full max-w-4xl">
        <ExperienceSection
          initialExperiences={initialExperiences}
          onCompletionChange={setHasExperience}
        />
      </div>
      <div className="mx-auto mt-6 w-full max-w-4xl">
        <SkillsSection
          initialSkills={initialSkills}
          onCompletionChange={setHasSkills}
        />
      </div>
      <div className="mx-auto mt-6 w-full max-w-4xl">
        <EducationSection
          initialEducation={initialEducation}
          onCompletionChange={setHasEducation}
        />
      </div>
      <div className="mx-auto mt-6 w-full max-w-4xl">
        <CareerPreferencesSection
          initialData={initialCareerPreferences}
          onCompletionChange={setHasCareerPreferencesState}
        />
      </div>
    </section>
  );
}
