type ProfileBody = Record<string, unknown>;

export type ParsedProfilePayload = {
  firstName: string;
  lastName: string;
};

function asRecord(value: unknown): ProfileBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as ProfileBody;
}

function asRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseProfileUpdatePayload(rawBody: unknown): {
  payload?: ParsedProfilePayload;
  error?: string;
} {
  const body = asRecord(rawBody);

  if (!body) {
    return { error: 'Invalid request body' };
  }

  const firstName = asRequiredText(body.firstName);
  const lastName = asRequiredText(body.lastName);

  if (!firstName || !lastName) {
    return { error: 'First name and last name are required' };
  }

  return {
    payload: {
      firstName,
      lastName,
    },
  };
}
