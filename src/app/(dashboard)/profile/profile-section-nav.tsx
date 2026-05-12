'use client';

export type ProfileSection = 'profile' | 'experience' | 'skills' | 'education' | 'career';

type ProfileSectionNavProps = {
  activeSection: ProfileSection;
  onSelectSection: (section: ProfileSection) => void;
};

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'education', label: 'Education' },
  { id: 'career', label: 'Career Preferences' },
] as const;

export function ProfileSectionNav({
  activeSection,
  onSelectSection,
}: ProfileSectionNavProps) {
  return (
    <nav className="flex flex-col gap-1 rounded-lg border border-(--surface-border) bg-(--surface) p-3">
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id as ProfileSection)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors text-left ${
            activeSection === section.id
              ? 'bg-(--action-bg) text-(--foreground) font-semibold'
              : 'text-(--text-muted) hover:bg-(--action-bg) hover:text-(--foreground)'
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
