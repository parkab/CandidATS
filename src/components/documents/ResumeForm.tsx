'use client';

import type {
  ResumeData,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
} from '@/lib/latex/types';

type Props = {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
};

const inputCls =
  'w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-1.5 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none';
const labelCls = 'mb-1 block text-xs font-medium text-(--text-muted)';
const sectionTitleCls = 'text-sm font-semibold text-(--foreground)';
const cardCls = 'rounded-lg border border-(--surface-border) p-3 mb-2';
const addBtnCls =
  'mt-1 rounded border border-(--surface-border) px-2 py-1 text-xs text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--foreground)';
const removeBtnCls =
  'rounded px-2 py-0.5 text-xs text-(--danger-text) hover:bg-(--danger-bg)';

function emptyEducation(): EducationEntry {
  return { institution: '', location: '', degree: '', dates: '' };
}

function emptyExperience(): ExperienceEntry {
  return { title: '', organization: '', location: '', dates: '', bullets: [''] };
}

function emptyProject(): ProjectEntry {
  return { name: '', tech: '', dates: '', bullets: [''] };
}

export default function ResumeForm({ data, onChange }: Props) {
  function setHeader(field: string, value: string) {
    onChange({ ...data, header: { ...data.header, [field]: value || undefined } });
  }

  function setSkill(field: string, value: string) {
    onChange({ ...data, skills: { ...data.skills, [field]: value || undefined } });
  }

  function updateEducation(i: number, field: keyof EducationEntry, value: string) {
    const education = data.education.map((e, idx) =>
      idx === i ? { ...e, [field]: value } : e,
    );
    onChange({ ...data, education });
  }

  function removeEducation(i: number) {
    onChange({ ...data, education: data.education.filter((_, idx) => idx !== i) });
  }

  function updateExperience(i: number, field: keyof Omit<ExperienceEntry, 'bullets'>, value: string) {
    const experience = data.experience.map((e, idx) =>
      idx === i ? { ...e, [field]: value } : e,
    );
    onChange({ ...data, experience });
  }

  function updateExpBullet(ei: number, bi: number, value: string) {
    const experience = data.experience.map((e, idx) => {
      if (idx !== ei) return e;
      return { ...e, bullets: e.bullets.map((b, j) => (j === bi ? value : b)) };
    });
    onChange({ ...data, experience });
  }

  function addExpBullet(ei: number) {
    const experience = data.experience.map((e, idx) =>
      idx === ei ? { ...e, bullets: [...e.bullets, ''] } : e,
    );
    onChange({ ...data, experience });
  }

  function removeExpBullet(ei: number, bi: number) {
    const experience = data.experience.map((e, idx) => {
      if (idx !== ei) return e;
      return { ...e, bullets: e.bullets.filter((_, j) => j !== bi) };
    });
    onChange({ ...data, experience });
  }

  function removeExperience(i: number) {
    onChange({ ...data, experience: data.experience.filter((_, idx) => idx !== i) });
  }

  function updateProject(i: number, field: keyof Omit<ProjectEntry, 'bullets'>, value: string) {
    const projects = data.projects.map((p, idx) =>
      idx === i ? { ...p, [field]: value } : p,
    );
    onChange({ ...data, projects });
  }

  function updateProjBullet(pi: number, bi: number, value: string) {
    const projects = data.projects.map((p, idx) => {
      if (idx !== pi) return p;
      return { ...p, bullets: p.bullets.map((b, j) => (j === bi ? value : b)) };
    });
    onChange({ ...data, projects });
  }

  function addProjBullet(pi: number) {
    const projects = data.projects.map((p, idx) =>
      idx === pi ? { ...p, bullets: [...p.bullets, ''] } : p,
    );
    onChange({ ...data, projects });
  }

  function removeProjBullet(pi: number, bi: number) {
    const projects = data.projects.map((p, idx) => {
      if (idx !== pi) return p;
      return { ...p, bullets: p.bullets.filter((_, j) => j !== bi) };
    });
    onChange({ ...data, projects });
  }

  function removeProject(i: number) {
    onChange({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="grid gap-6 pb-4">

      {/* Header */}
      <section>
        <p className={sectionTitleCls + ' mb-3'}>Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} value={data.header.name} onChange={(e) => setHeader('name', e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input className={inputCls} value={data.header.phone} onChange={(e) => setHeader('phone', e.target.value)} placeholder="555-123-4567" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input className={inputCls} value={data.header.email} onChange={(e) => setHeader('email', e.target.value)} placeholder="jane@example.com" />
          </div>
          <div>
            <label className={labelCls}>LinkedIn URL</label>
            <input className={inputCls} value={data.header.linkedin ?? ''} onChange={(e) => setHeader('linkedin', e.target.value)} placeholder="linkedin.com/in/..." />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>GitHub URL</label>
            <input className={inputCls} value={data.header.github ?? ''} onChange={(e) => setHeader('github', e.target.value)} placeholder="github.com/..." />
          </div>
        </div>
      </section>

      {/* Education */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className={sectionTitleCls}>Education</p>
          <button type="button" className={addBtnCls} onClick={() => onChange({ ...data, education: [...data.education, emptyEducation()] })}>
            + Add
          </button>
        </div>
        {data.education.map((edu, i) => (
          <div key={i} className={cardCls}>
            <div className="mb-2 flex justify-end">
              <button type="button" className={removeBtnCls} onClick={() => removeEducation(i)}>Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className={labelCls}>Institution</label>
                <input className={inputCls} value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} placeholder="University Name" />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} value={edu.location} onChange={(e) => updateEducation(i, 'location', e.target.value)} placeholder="City, State" />
              </div>
              <div>
                <label className={labelCls}>Dates</label>
                <input className={inputCls} value={edu.dates} onChange={(e) => updateEducation(i, 'dates', e.target.value)} placeholder="Aug. 2020 -- May 2024" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Degree</label>
                <input className={inputCls} value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} placeholder="Bachelor of Science in Computer Science" />
              </div>
              <div>
                <label className={labelCls}>GPA</label>
                <input className={inputCls} value={edu.gpa ?? ''} onChange={(e) => updateEducation(i, 'gpa', e.target.value)} placeholder="3.8" />
              </div>
              <div>
                <label className={labelCls}>Honors</label>
                <input className={inputCls} value={edu.honors ?? ''} onChange={(e) => updateEducation(i, 'honors', e.target.value)} placeholder="Magna Cum Laude" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Experience */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className={sectionTitleCls}>Experience</p>
          <button type="button" className={addBtnCls} onClick={() => onChange({ ...data, experience: [...data.experience, emptyExperience()] })}>
            + Add
          </button>
        </div>
        {data.experience.map((exp, ei) => (
          <div key={ei} className={cardCls}>
            <div className="mb-2 flex justify-end">
              <button type="button" className={removeBtnCls} onClick={() => removeExperience(ei)}>Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={exp.title} onChange={(e) => updateExperience(ei, 'title', e.target.value)} placeholder="Software Engineer" />
              </div>
              <div>
                <label className={labelCls}>Organization</label>
                <input className={inputCls} value={exp.organization} onChange={(e) => updateExperience(ei, 'organization', e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} value={exp.location} onChange={(e) => updateExperience(ei, 'location', e.target.value)} placeholder="New York, NY" />
              </div>
              <div>
                <label className={labelCls}>Dates</label>
                <input className={inputCls} value={exp.dates} onChange={(e) => updateExperience(ei, 'dates', e.target.value)} placeholder="June 2022 -- Present" />
              </div>
            </div>
            <div className="mt-2">
              <label className={labelCls}>Bullets</label>
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="mb-1 flex gap-1">
                  <input className={inputCls} value={b} onChange={(e) => updateExpBullet(ei, bi, e.target.value)} placeholder="Achievement or responsibility..." />
                  <button type="button" className={removeBtnCls + ' shrink-0'} onClick={() => removeExpBullet(ei, bi)}>×</button>
                </div>
              ))}
              <button type="button" className={addBtnCls} onClick={() => addExpBullet(ei)}>+ Add bullet</button>
            </div>
          </div>
        ))}
      </section>

      {/* Projects */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className={sectionTitleCls}>Projects</p>
          <button type="button" className={addBtnCls} onClick={() => onChange({ ...data, projects: [...data.projects, emptyProject()] })}>
            + Add
          </button>
        </div>
        {data.projects.map((proj, pi) => (
          <div key={pi} className={cardCls}>
            <div className="mb-2 flex justify-end">
              <button type="button" className={removeBtnCls} onClick={() => removeProject(pi)}>Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Project Name</label>
                <input className={inputCls} value={proj.name} onChange={(e) => updateProject(pi, 'name', e.target.value)} placeholder="My Project" />
              </div>
              <div>
                <label className={labelCls}>Dates</label>
                <input className={inputCls} value={proj.dates} onChange={(e) => updateProject(pi, 'dates', e.target.value)} placeholder="Jan. 2024 -- May 2024" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Tech Stack</label>
                <input className={inputCls} value={proj.tech} onChange={(e) => updateProject(pi, 'tech', e.target.value)} placeholder="Python, React, PostgreSQL" />
              </div>
            </div>
            <div className="mt-2">
              <label className={labelCls}>Bullets</label>
              {proj.bullets.map((b, bi) => (
                <div key={bi} className="mb-1 flex gap-1">
                  <input className={inputCls} value={b} onChange={(e) => updateProjBullet(pi, bi, e.target.value)} placeholder="What you built and its impact..." />
                  <button type="button" className={removeBtnCls + ' shrink-0'} onClick={() => removeProjBullet(pi, bi)}>×</button>
                </div>
              ))}
              <button type="button" className={addBtnCls} onClick={() => addProjBullet(pi)}>+ Add bullet</button>
            </div>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section>
        <p className={sectionTitleCls + ' mb-3'}>Skills</p>
        <div className="grid grid-cols-2 gap-3">
          {(['languages', 'frameworks', 'tools', 'libraries'] as const).map((field) => (
            <div key={field}>
              <label className={labelCls}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                className={inputCls}
                value={data.skills[field] ?? ''}
                onChange={(e) => setSkill(field, e.target.value)}
                placeholder={field === 'languages' ? 'TypeScript, Python, Go' : field === 'frameworks' ? 'React, Next.js, Express' : field === 'tools' ? 'Git, Docker, AWS' : 'NumPy, Pandas'}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
