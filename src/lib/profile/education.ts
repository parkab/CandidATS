type RawBody = Record<string, unknown>;

export type ParsedEducationCreatePayload = {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: Date;
  endDate: Date | null;
  honors: string | null;
  gpa: string | null;
};

export type ParsedEducationUpdatePayload = {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date | null;
  honors?: string | null;
  gpa?: string | null;
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

function asDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function parseEducationCreatePayload(rawBody: unknown): {
  payload?: ParsedEducationCreatePayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  const institution = asRequiredText(body.institution);
  if (!institution) return { error: 'institution is required' };

  const degree = asRequiredText(body.degree);
  if (!degree) return { error: 'degree is required' };

  const fieldOfStudy = asRequiredText(body.fieldOfStudy);
  if (!fieldOfStudy) return { error: 'fieldOfStudy is required' };

  const startDate = asDate(body.startDate);
  if (!startDate) return { error: 'startDate is required and must be a valid date' };

  const endDate = body.endDate !== undefined ? asDate(body.endDate) : null;
  if (body.endDate !== undefined && body.endDate !== null && body.endDate !== '' && !endDate) {
    return { error: 'endDate must be a valid date' };
  }

  if (endDate && endDate < startDate) {
    return { error: 'endDate must not be before startDate' };
  }

  return {
    payload: {
      institution,
      degree,
      fieldOfStudy,
      startDate,
      endDate,
      honors: asOptionalText(body.honors),
      gpa: asOptionalText(body.gpa),
    },
  };
}

export function parseEducationUpdatePayload(rawBody: unknown): {
  payload?: ParsedEducationUpdatePayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  const result: ParsedEducationUpdatePayload = {};

  if (body.institution !== undefined) {
    const institution = asRequiredText(body.institution);
    if (!institution) return { error: 'institution must not be empty' };
    result.institution = institution;
  }

  if (body.degree !== undefined) {
    const degree = asRequiredText(body.degree);
    if (!degree) return { error: 'degree must not be empty' };
    result.degree = degree;
  }

  if (body.fieldOfStudy !== undefined) {
    const fieldOfStudy = asRequiredText(body.fieldOfStudy);
    if (!fieldOfStudy) return { error: 'fieldOfStudy must not be empty' };
    result.fieldOfStudy = fieldOfStudy;
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

  if (body.honors !== undefined) {
    result.honors = asOptionalText(body.honors);
  }

  if (body.gpa !== undefined) {
    result.gpa = asOptionalText(body.gpa);
  }

  if (Object.keys(result).length === 0) {
    return { error: 'No updatable fields provided' };
  }

  return { payload: result };
}
