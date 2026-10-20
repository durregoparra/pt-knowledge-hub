// Where signed-in users land, and where a `?next=` value is allowed to send them.
export const APP_HOME = '/hub';

// Only same-site paths: rejects absolute URLs and protocol-relative ones such as //evil.com.
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return APP_HOME;
  return next;
}
