type RawBody = Record<string, unknown>;

export type ParsedSkillCreatePayload = {
  name: string;
  category: string | null;
  proficiencyLabel: string | null;
  sortOrder: number;
};

export type ParsedSkillUpdatePayload = {
  name?: string;
  category?: string | null;
  proficiencyLabel?: string | null;
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

function asSortOrder(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return 0;
}

export function parseSkillCreatePayload(rawBody: unknown): {
  payload?: ParsedSkillCreatePayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  const name = asRequiredText(body.name);
  if (!name) return { error: 'name is required' };

  return {
    payload: {
      name,
      category: asOptionalText(body.category),
      proficiencyLabel: asOptionalText(body.proficiencyLabel),
      sortOrder: asSortOrder(body.sortOrder),
    },
  };
}

export function parseSkillUpdatePayload(rawBody: unknown): {
  payload?: ParsedSkillUpdatePayload;
  error?: string;
} {
  const body = asRecord(rawBody);
  if (!body) return { error: 'Invalid request body' };

  const result: ParsedSkillUpdatePayload = {};

  if (body.name !== undefined) {
    const name = asRequiredText(body.name);
    if (!name) return { error: 'name must not be empty' };
    result.name = name;
  }

  if (body.category !== undefined) {
    result.category = asOptionalText(body.category);
  }

  if (body.proficiencyLabel !== undefined) {
    result.proficiencyLabel = asOptionalText(body.proficiencyLabel);
  }

  if (body.sortOrder !== undefined) {
    result.sortOrder = asSortOrder(body.sortOrder);
  }

  if (Object.keys(result).length === 0) {
    return { error: 'No updatable fields provided' };
  }

  return { payload: result };
}
