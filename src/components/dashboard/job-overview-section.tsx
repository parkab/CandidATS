import type { ApplicationStatus } from '@/lib/jobs/status';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import type {
  JobOverviewDraft,
  RequiredOverviewFieldName,
} from '@/lib/jobs/multi-step-form';

type JobOverviewSectionProps = {
  overview: JobOverviewDraft;
  fieldErrors: Partial<Record<RequiredOverviewFieldName, string>>;
  setOverviewField: <K extends keyof JobOverviewDraft>(
    fieldName: K,
    value: JobOverviewDraft[K],
  ) => void;
  getMixedStageColor: (stage: ApplicationStatus) => string;
};

export default function JobOverviewSection({
  overview,
  fieldErrors,
  setOverviewField,
  getMixedStageColor,
}: JobOverviewSectionProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <label
          htmlFor="title"
          className="text-sm font-semibold text-(--foreground)"
        >
          Job Position
          <span className="ml-1 text-(--danger-text)" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> required</span>
        </label>
        <div
          className="profile-input-wrap"
          data-error={Boolean(fieldErrors.title)}
        >
          <input
            id="title"
            type="text"
            required
            value={overview.title}
            className="profile-input"
            placeholder="Software Engineer"
            onChange={(event) => setOverviewField('title', event.target.value)}
          />
        </div>
        {fieldErrors.title ? (
          <p className="text-xs font-medium text-(--danger-text)" role="alert">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="company"
          className="text-sm font-semibold text-(--foreground)"
        >
          Company Name
          <span className="ml-1 text-(--danger-text)" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> required</span>
        </label>
        <div
          className="profile-input-wrap"
          data-error={Boolean(fieldErrors.company)}
        >
          <input
            id="company"
            type="text"
            required
            value={overview.company}
            className="profile-input"
            placeholder="Google"
            onChange={(event) =>
              setOverviewField('company', event.target.value)
            }
          />
        </div>
        {fieldErrors.company ? (
          <p className="text-xs font-medium text-(--danger-text)" role="alert">
            {fieldErrors.company}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="location"
          className="text-sm font-semibold text-(--foreground)"
        >
          Location
          <span className="ml-1 text-(--danger-text)" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> required</span>
        </label>
        <div
          className="profile-input-wrap"
          data-error={Boolean(fieldErrors.location)}
        >
          <input
            id="location"
            type="text"
            required
            value={overview.location}
            className="profile-input"
            placeholder="New York, NY"
            onChange={(event) =>
              setOverviewField('location', event.target.value)
            }
          />
        </div>
        {fieldErrors.location ? (
          <p className="text-xs font-medium text-(--danger-text)" role="alert">
            {fieldErrors.location}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="stage"
          className="text-sm font-semibold text-(--foreground)"
        >
          Stage
          <span className="ml-1 text-(--danger-text)" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> required</span>
        </label>
        <div
          className="profile-input-wrap"
          data-error={Boolean(fieldErrors.stage)}
        >
          <select
            id="stage"
            required
            className="profile-input"
            value={overview.stage}
            onChange={(event) =>
              setOverviewField('stage', event.target.value as ApplicationStatus)
            }
            style={{ color: getMixedStageColor(overview.stage) }}
          >
            {(Object.keys(APPLICATION_STATUS_COLOR) as ApplicationStatus[]).map(
              (stage) => (
                <option
                  key={stage}
                  value={stage}
                  style={{ color: getMixedStageColor(stage) }}
                >
                  {stage}
                </option>
              ),
            )}
          </select>
        </div>
        {fieldErrors.stage ? (
          <p className="text-xs font-medium text-(--danger-text)" role="alert">
            {fieldErrors.stage}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="last-activity-date"
          className="text-sm font-semibold text-(--foreground)"
        >
          Last Activity Date
          <span className="ml-1 text-(--danger-text)" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> required</span>
        </label>
        <div
          className="profile-input-wrap"
          data-error={Boolean(fieldErrors.lastActivityDate)}
        >
          <input
            id="last-activity-date"
            type="date"
            required
            value={overview.lastActivityDate}
            className="profile-input"
            onChange={(event) =>
              setOverviewField('lastActivityDate', event.target.value)
            }
          />
        </div>
        {fieldErrors.lastActivityDate ? (
          <p className="text-xs font-medium text-(--danger-text)" role="alert">
            {fieldErrors.lastActivityDate}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="deadline"
          className="text-sm font-semibold text-(--foreground)"
        >
          Deadline
        </label>
        <div className="profile-input-wrap">
          <input
            id="deadline"
            type="date"
            className="profile-input"
            value={overview.deadline}
            onChange={(event) =>
              setOverviewField('deadline', event.target.value)
            }
          />
        </div>
      </div>

      <label
        htmlFor="priority"
        className="flex items-center gap-3 rounded-md border border-(--surface-border) px-3 py-2"
      >
        <input
          id="priority"
          type="checkbox"
          checked={overview.priority}
          onChange={(event) =>
            setOverviewField('priority', event.target.checked)
          }
          className="h-4 w-4 accent-(--foreground)"
        />
        <span className="text-sm font-semibold text-(--foreground)">
          Priority
        </span>
      </label>

      <div className="grid gap-1.5">
        <label
          htmlFor="job-description"
          className="text-sm font-semibold text-(--foreground)"
        >
          Job Description
        </label>
        <div className="profile-input-wrap">
          <textarea
            id="job-description"
            rows={4}
            value={overview.jobDescription}
            className="profile-input profile-textarea"
            placeholder="Role summary, requirements, and responsibilities"
            onChange={(event) =>
              setOverviewField('jobDescription', event.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="compensation"
          className="text-sm font-semibold text-(--foreground)"
        >
          Compensation
        </label>
        <div className="profile-input-wrap">
          <input
            id="compensation"
            type="text"
            value={overview.compensation}
            className="profile-input"
            placeholder="$200,000 base + $50,000 bonus"
            onChange={(event) =>
              setOverviewField('compensation', event.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="application-date"
          className="text-sm font-semibold text-(--foreground)"
        >
          Application Date
        </label>
        <div className="profile-input-wrap">
          <input
            id="application-date"
            type="date"
            value={overview.applicationDate}
            className="profile-input"
            onChange={(event) =>
              setOverviewField('applicationDate', event.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="recruiter-notes"
          className="text-sm font-semibold text-(--foreground)"
        >
          Recruiter Notes
        </label>
        <div className="profile-input-wrap">
          <textarea
            id="recruiter-notes"
            rows={3}
            value={overview.recruiterNotes}
            className="profile-input profile-textarea"
            placeholder="Recruiter contact details and notes"
            onChange={(event) =>
              setOverviewField('recruiterNotes', event.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="prep-notes"
          className="text-sm font-semibold text-(--foreground)"
        >
          Interview Prep Notes
        </label>
        <div className="profile-input-wrap">
          <textarea
            id="prep-notes"
            rows={6}
            value={overview.prepNotes}
            className="profile-input profile-textarea"
            placeholder="Key talking points, questions to ask, company research highlights, or any technical prep notes should go here!"
            onChange={(event) =>
              setOverviewField('prepNotes', event.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="other-notes"
          className="text-sm font-semibold text-(--foreground)"
        >
          Other Notes
        </label>
        <div className="profile-input-wrap">
          <textarea
            id="other-notes"
            rows={4}
            value={overview.otherNotes}
            className="profile-input profile-textarea"
            placeholder="Anything else worth tracking"
            onChange={(event) =>
              setOverviewField('otherNotes', event.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
}
