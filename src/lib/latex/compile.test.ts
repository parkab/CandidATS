/** @jest-environment node */

import { compileLatex } from './compile';

const FAKE_ENV = {
  LATEX_SERVICE_URL: 'https://latex.example.com',
  LATEX_SERVICE_TOKEN: 'test-token',
};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

beforeEach(() => setEnv(FAKE_ENV));
afterEach(() =>
  setEnv({
    LATEX_SERVICE_URL: undefined,
    LATEX_SERVICE_TOKEN: undefined,
  }),
);

describe('compileLatex', () => {
  it('returns a PDF buffer on success', async () => {
    const fakeBytes = Buffer.from('%PDF-1.4 fake');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });

    const result = await compileLatex('\\documentclass{article}');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toContain('%PDF');
  });

  it('throws when the service returns a non-200 status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Compilation failed'),
    });

    await expect(compileLatex('bad latex')).rejects.toThrow(
      'LaTeX service returned 422',
    );
  });

  it('throws when env vars are missing', async () => {
    setEnv({ LATEX_SERVICE_URL: undefined, LATEX_SERVICE_TOKEN: undefined });
    await expect(compileLatex('\\documentclass{article}')).rejects.toThrow(
      'LATEX_SERVICE_URL and LATEX_SERVICE_TOKEN must be set',
    );
  });
});
