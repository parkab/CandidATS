type RawBody = Record<string, unknown>;

export const EXPERIENCE_TYPES = ['employment', 'project'] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export type ParsedExperienceCreatePayload = {
  type: ExperienceType;
  title: string;
  organization: string;
  role: string | null;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  accomplishments: string | null;
  sortOrder: number;
};

export type ParsedExperienceUpdatePayload = {
  type?: ExperienceType;
  title?: string;
  organization?: string;
  role?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  description?: string | null;
  accomplishments?: string | null;
  sortOrder?: number;
};

function asRecord(value: unknown): RawBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as RawBody;
}

function asRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asExperienceType(value: unknown): ExperienceType | null {
  if (EXPERIENCE_TYPES.includes(value as ExperienceType)) {
    return value as ExperienceType;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function asSortOrder(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return 0;
}

export function parseExperienceCreatePayload(rawBody: unknown): {
  payload?: ParsedExperienceCreatePayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  const type = asExperienceType(body.type);
  if (!type) return { error: 'type must be "employment" or "project"' };

  const title = asRequiredText(body.title);
  if (!title) return { error: 'title is required' };

  const organization = asRequiredText(body.organization);
  if (!organization) return { error: 'organization is required' };

  const startDate = asDate(body.startDate);
  if (!startDate)
    return { error: 'startDate is required and must be a valid date' };

  const endDate = body.endDate !== undefined ? asDate(body.endDate) : null;
  if (
    body.endDate !== undefined &&
    body.endDate !== null &&
    body.endDate !== '' &&
    !endDate
  ) {
    return { error: 'endDate must be a valid date' };
  }

  if (endDate && endDate < startDate) {
    return { error: 'endDate must not be before startDate' };
  }

  return {
    payload: {
      type,
      title,
      organization,
      role: asOptionalText(body.role),
      startDate,
      endDate,
      description: asOptionalText(body.description),
      accomplishments: asOptionalText(body.accomplishments),
      sortOrder: asSortOrder(body.sortOrder),
    },
  };
}

export function parseExperienceUpdatePayload(rawBody: unknown): {
  payload?: ParsedExperienceUpdatePayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  const result: ParsedExperienceUpdatePayload = {};

  if (body.type !== undefined) {
    const type = asExperienceType(body.type);
    if (!type) return { error: 'type must be "employment" or "project"' };
    result.type = type;
  }

  if (body.title !== undefined) {
    const title = asRequiredText(body.title);
    if (!title) return { error: 'title must not be empty' };
    result.title = title;
  }

  if (body.organization !== undefined) {
    const organization = asRequiredText(body.organization);
    if (!organization) return { error: 'organization must not be empty' };
    result.organization = organization;
  }

  if (body.role !== undefined) {
    result.role = asOptionalText(body.role);
  }

  if (body.startDate !== undefined) {
    const startDate = asDate(body.startDate);
    if (!startDate) return { error: 'startDate must be a valid date' };
    result.startDate = startDate;
  }

  if (body.endDate !== undefined) {
    if (body.endDate === null || body.endDate === '') {
      result.endDate = null;
    } else {
      const endDate = asDate(body.endDate);
      if (!endDate) return { error: 'endDate must be a valid date' };
      result.endDate = endDate;
    }
  }

  if (result.startDate && result.endDate && result.endDate < result.startDate) {
    return { error: 'endDate must not be before startDate' };
  }

  if (body.description !== undefined) {
    result.description = asOptionalText(body.description);
  }

  if (body.accomplishments !== undefined) {
    result.accomplishments = asOptionalText(body.accomplishments);
  }

  if (body.sortOrder !== undefined) {
    if (
      typeof body.sortOrder !== 'number' ||
      !Number.isInteger(body.sortOrder) ||
      body.sortOrder < 0
    ) {
      return { error: 'sortOrder must be a non-negative integer' };
    }
    result.sortOrder = body.sortOrder;
  }

  if (Object.keys(result).length === 0) {
    return { error: 'No updatable fields provided' };
  }

  return { payload: result };
}
