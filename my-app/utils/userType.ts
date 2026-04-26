export type CanonicalUserType = 'client' | 'professional' | 'admin';

export function parseCanonicalUserType(raw: unknown): CanonicalUserType | undefined {
  if (raw === 'client' || raw === 'professional' || raw === 'admin') return raw;
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim().toLowerCase();
  if (s === 'professional' || s === 'profesional') return 'professional';
  if (s === 'client' || s === 'cliente') return 'client';
  if (s === 'admin' || s === 'administrator') return 'admin';
  return undefined;
}

export function resolveUserTypeFromDoc(
  docUserType: unknown,
  mergeBase?: { userType?: string } | null
): CanonicalUserType {
  const fromDoc = parseCanonicalUserType(docUserType);
  if (fromDoc !== undefined) return fromDoc;
  const fromBase = parseCanonicalUserType(mergeBase?.userType);
  if (fromBase !== undefined) return fromBase;
  return 'client';
}

export function isProfessionalUser(user: { userType?: string } | null | undefined): boolean {
  return parseCanonicalUserType(user?.userType) === 'professional';
}
