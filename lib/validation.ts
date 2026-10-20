// Input checks for the form API routes. The routes write with the secret key (no RLS),
// so these mirror the table constraints and reject bad input before it reaches the database.

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

export type Parsed<T> = { ok: true; value: T } | { ok: false };

// Trimmed, lower-cased email; null when empty.
export function parseEmail(input: unknown): Parsed<string | null> {
  if (input == null) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false };
  const email = input.trim().toLowerCase();
  if (!email) return { ok: true, value: null };
  if (email.length < 3 || email.length > 254 || !EMAIL_SHAPE.test(email)) return { ok: false };
  return { ok: true, value: email };
}

export function parseMessage(input: unknown): Parsed<string> {
  if (typeof input !== 'string') return { ok: false };
  const message = input.trim();
  if (message.length < 1 || message.length > 2000) return { ok: false };
  return { ok: true, value: message };
}

// Trimmed text of 1..max characters.
export function parseText(input: unknown, max: number): Parsed<string> {
  if (typeof input !== 'string') return { ok: false };
  const text = input.trim();
  if (text.length < 1 || text.length > max) return { ok: false };
  return { ok: true, value: text };
}

// One of the keys of `options`.
export function parseChoice<K extends string>(input: unknown, options: Record<K, string>): Parsed<K> {
  if (typeof input !== 'string' || !Object.hasOwn(options, input)) return { ok: false };
  return { ok: true, value: input as K };
}

// A row id (bigint identity): a positive whole number.
export function parseId(input: unknown): Parsed<number> {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 1) return { ok: false };
  return { ok: true, value: input };
}

// Passwords are not trimmed. 72 is the longest password Supabase Auth accepts.
export const PASSWORD_MIN = 8;
export function parsePassword(input: unknown): Parsed<string> {
  if (typeof input !== 'string') return { ok: false };
  if (input.length < PASSWORD_MIN || input.length > 72) return { ok: false };
  return { ok: true, value: input };
}

// Honeypot field: real visitors never fill it.
export const isBot = (body: Record<string, unknown>) => Boolean(body.website);

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
