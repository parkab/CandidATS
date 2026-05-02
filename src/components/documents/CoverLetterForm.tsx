'use client';

import type { CoverLetterData } from '@/lib/latex/types';

type Props = {
  data: CoverLetterData;
  onChange: (data: CoverLetterData) => void;
};

const inputCls =
  'w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-1.5 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none';
const textareaCls =
  'w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none resize-y';
const labelCls = 'mb-1 block text-xs font-medium text-(--text-muted)';
const sectionTitleCls = 'text-sm font-semibold text-(--foreground)';
const addBtnCls =
  'mt-1 rounded border border-(--surface-border) px-2 py-1 text-xs text-(--text-muted) hover:bg-(--action-hover) hover:text-(--foreground)';
const removeBtnCls =
  'rounded px-2 py-0.5 text-xs text-(--danger-text) hover:bg-(--danger-bg)';

export default function CoverLetterForm({ data, onChange }: Props) {
  function set(field: keyof CoverLetterData, value: string) {
    onChange({ ...data, [field]: value || undefined });
  }

  function setHeader(field: string, value: string) {
    onChange({ ...data, header: { ...data.header, [field]: value || undefined } });
  }

  function updateParagraph(i: number, value: string) {
    const paragraphs = data.paragraphs.map((p, idx) => (idx === i ? value : p));
    onChange({ ...data, paragraphs });
  }

  function addParagraph() {
    onChange({ ...data, paragraphs: [...data.paragraphs, ''] });
  }

  function removeParagraph(i: number) {
    onChange({ ...data, paragraphs: data.paragraphs.filter((_, idx) => idx !== i) });
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
        </div>
      </section>

      {/* Letter metadata */}
      <section>
        <p className={sectionTitleCls + ' mb-3'}>Letter Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input className={inputCls} value={data.date} onChange={(e) => set('date', e.target.value)} placeholder="April 30, 2026" />
          </div>
          <div>
            <label className={labelCls}>Sender Name</label>
            <input className={inputCls} value={data.senderName} onChange={(e) => set('senderName', e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={labelCls}>Company</label>
            <input className={inputCls} value={data.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <input className={inputCls} value={data.role ?? ''} onChange={(e) => set('role', e.target.value)} placeholder="Software Engineer" />
          </div>
          <div>
            <label className={labelCls}>Recipient Name</label>
            <input className={inputCls} value={data.recipientName ?? ''} onChange={(e) => set('recipientName', e.target.value)} placeholder="Hiring Manager" />
          </div>
          <div>
            <label className={labelCls}>Recipient Title</label>
            <input className={inputCls} value={data.recipientTitle ?? ''} onChange={(e) => set('recipientTitle', e.target.value)} placeholder="Head of Engineering (optional)" />
          </div>
        </div>
      </section>

      {/* Paragraphs */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className={sectionTitleCls}>Body Paragraphs</p>
          <button type="button" className={addBtnCls} onClick={addParagraph}>+ Add</button>
        </div>
        {data.paragraphs.map((p, i) => (
          <div key={i} className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls}>Paragraph {i + 1}</label>
              {data.paragraphs.length > 1 && (
                <button type="button" className={removeBtnCls} onClick={() => removeParagraph(i)}>Remove</button>
              )}
            </div>
            <textarea
              className={textareaCls}
              rows={4}
              value={p}
              onChange={(e) => updateParagraph(i, e.target.value)}
              placeholder={i === 0 ? 'Opening: express strong interest and state your top qualification...' : i === 1 ? 'Body: connect 2–3 specific experiences to the job requirements...' : 'Closing: summarize fit, express enthusiasm, request an interview...'}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
