type ProfileBody = Record<string, unknown>;

export type ParsedProfilePayload = {
  firstName: string;
  lastName: string;
  phone: string | null;
  location: string | null;
  linkedIn: string | null;
  headline: string | null;
  bio: string | null;
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

function asOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLinkedInUrl(value: string): string | null {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    const protocolIsValid = ['http:', 'https:'].includes(url.protocol);
    const host = url.hostname.toLowerCase();
    const isLinkedInHost =
      host === 'linkedin.com' ||
      host === 'www.linkedin.com' ||
      host.endsWith('.linkedin.com');

    if (!protocolIsValid || !isLinkedInHost) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
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
  const phone = asOptionalText(body.phone);
  const location = asOptionalText(body.location);
  const linkedInRaw = asOptionalText(body.linkedIn);
  const headline = asOptionalText(body.headline);
  const bio = asOptionalText(body.bio);
  const linkedIn = linkedInRaw ? normalizeLinkedInUrl(linkedInRaw) : null;

  if (!firstName || !lastName) {
    return { error: 'First name and last name are required' };
  }

  if (linkedInRaw && !linkedIn) {
    return { error: 'LinkedIn URL must be a valid linkedin.com link' };
  }

  return {
    payload: {
      firstName,
      lastName,
      phone,
      location,
      linkedIn,
      headline,
      bio,
    },
  };
}
