type RawBody = Record<string, unknown>;

export const WORK_MODE_VALUES = ['Remote', 'Hybrid', 'On-site'] as const;
export type WorkMode = (typeof WORK_MODE_VALUES)[number];

export type ParsedCareerPreferencesPayload = {
  targetRoles: string | null;
  targetLocations: string | null;
  workMode: WorkMode | null;
  salaryPreference: string | null;
};

function asRecord(value: unknown): RawBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as RawBody;
}

function asOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asWorkMode(value: unknown): WorkMode | null {
  if (WORK_MODE_VALUES.includes(value as WorkMode)) {
    return value as WorkMode;
  }
  return null;
}

export function parseCareerPreferencesPayload(rawBody: unknown): {
  payload?: ParsedCareerPreferencesPayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  if (
    body.workMode !== undefined &&
    body.workMode !== null &&
    body.workMode !== ''
  ) {
    const workMode = asWorkMode(body.workMode);
    if (!workMode) {
      return {
        error: 'workMode must be "Remote", "Hybrid", or "On-site"',
      };
    }
  }

  const resolvedWorkMode =
    body.workMode === null || body.workMode === ''
      ? null
      : body.workMode !== undefined
        ? asWorkMode(body.workMode)
        : null;

  return {
    payload: {
      targetRoles: asOptionalText(body.targetRoles),
      targetLocations: asOptionalText(body.targetLocations),
      workMode: resolvedWorkMode,
      salaryPreference: asOptionalText(body.salaryPreference),
    },
  };
}
