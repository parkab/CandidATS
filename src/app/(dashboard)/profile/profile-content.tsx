'use client';

import { useMemo, useState } from 'react';
import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import ProfilePanel from './profile-panel';
import { ProfileCompletionBar } from './profile-completion-bar';
import {
  ProfileSectionNav,
  type ProfileSection,
} from './profile-section-nav';
import { calculateProfileBaselineCompletion } from '@/lib/profile/profile';
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
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
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

  const baselineCompletion = useMemo(
    () =>
      calculateProfileBaselineCompletion({
        firstName: initialProfile.firstName,
        lastName: initialProfile.lastName,
        phone: initialProfile.phone,
        location: initialProfile.location,
        linkedIn: initialProfile.linkedIn,
        headline: initialProfile.headline,
        bio: initialProfile.bio,
        hasExperience,
        hasEducation,
        hasSkills,
        hasCareerPreferences: hasCareerPreferencesState,
      }),
    [
      hasCareerPreferencesState,
      hasEducation,
      hasExperience,
      hasSkills,
      initialProfile.bio,
      initialProfile.firstName,
      initialProfile.headline,
      initialProfile.lastName,
      initialProfile.linkedIn,
      initialProfile.location,
      initialProfile.phone,
    ],
  );

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className={GRADIENT_HEADING_CLASS}>Profile</h1>
        </div>

        <div className="mb-8">
          <ProfileCompletionBar completionData={baselineCompletion} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
          {/* Sidebar Navigation */}
          <div className="sticky top-20 h-fit">
            <ProfileSectionNav
              activeSection={activeSection}
              onSelectSection={setActiveSection}
            />
          </div>

          {/* Main Content Area */}
          <div>
            {activeSection === 'profile' && (
              <ProfilePanel initialProfile={initialProfile} {...profilePanelProps} />
            )}

            {activeSection === 'experience' && (
              <div>
                <ExperienceSection
                  initialExperiences={initialExperiences}
                  onCompletionChange={setHasExperience}
                />
              </div>
            )}

            {activeSection === 'skills' && (
              <div>
                <SkillsSection
                  initialSkills={initialSkills}
                  onCompletionChange={setHasSkills}
                />
              </div>
            )}

            {activeSection === 'education' && (
              <div>
                <EducationSection
                  initialEducation={initialEducation}
                  onCompletionChange={setHasEducation}
                />
              </div>
            )}

            {activeSection === 'career' && (
              <div>
                <CareerPreferencesSection
                  initialData={initialCareerPreferences}
                  onCompletionChange={setHasCareerPreferencesState}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
