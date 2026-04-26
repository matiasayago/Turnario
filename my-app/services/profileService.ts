import { getBackendBaseUrl } from '../config/backend';
import { resolveUserTypeFromDoc } from '../utils/userType';
import {
  User,
  UserBusinessInfo,
  UserBusinessType,
  UserCertificationEntry,
  UserEducationEntry,
  UserLanguageEntry,
} from './authService';

function isoDateOnly(v: unknown): string | undefined {
  if (v == null) return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function mapBusinessInfo(raw: unknown): UserBusinessInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const bi = raw as Record<string, unknown>;
  const out: UserBusinessInfo = {};

  if (typeof bi.businessName === 'string' && bi.businessName.trim()) {
    out.businessName = bi.businessName.trim();
  }
  if (typeof bi.businessType === 'string') {
    const allowed: UserBusinessType[] = [
      'medical',
      'beauty',
      'fitness',
      'education',
      'consulting',
      'repair',
      'cleaning',
      'transport',
      'food',
      'retail',
      'other',
    ];
    if (allowed.includes(bi.businessType as UserBusinessType)) {
      out.businessType = bi.businessType as UserBusinessType;
    }
  }
  if (typeof bi.businessCategory === 'string' && bi.businessCategory.trim()) {
    out.businessCategory = bi.businessCategory.trim();
  }
  if (typeof bi.license === 'string' && bi.license.trim()) {
    out.license = bi.license.trim();
  }
  if (Array.isArray(bi.specialties) && bi.specialties.length) {
    out.specialties = bi.specialties.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (typeof bi.experience === 'number' && !Number.isNaN(bi.experience)) {
    out.experience = bi.experience;
  } else if (bi.experience != null && bi.experience !== '') {
    const n = parseInt(String(bi.experience), 10);
    if (!Number.isNaN(n)) out.experience = n;
  }
  if (Array.isArray(bi.skills) && bi.skills.length) {
    out.skills = bi.skills.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (Array.isArray(bi.education) && bi.education.length) {
    out.education = bi.education
      .map((e): UserEducationEntry | null => {
        if (!e || typeof e !== 'object') return null;
        const o = e as Record<string, unknown>;
        const entry: UserEducationEntry = {};
        if (typeof o.degree === 'string' && o.degree.trim()) entry.degree = o.degree.trim();
        if (typeof o.institution === 'string' && o.institution.trim()) {
          entry.institution = o.institution.trim();
        }
        if (o.year != null) {
          const y = typeof o.year === 'number' ? o.year : parseInt(String(o.year), 10);
          if (!Number.isNaN(y)) entry.year = y;
        }
        return entry.degree || entry.institution || entry.year != null ? entry : null;
      })
      .filter((x): x is UserEducationEntry => x != null);
    if (out.education.length === 0) delete out.education;
  }
  if (Array.isArray(bi.certifications) && bi.certifications.length) {
    out.certifications = bi.certifications
      .map((c): UserCertificationEntry | null => {
        if (!c || typeof c !== 'object') return null;
        const o = c as Record<string, unknown>;
        const entry: UserCertificationEntry = {};
        if (typeof o.name === 'string' && o.name.trim()) entry.name = o.name.trim();
        if (typeof o.issuer === 'string' && o.issuer.trim()) entry.issuer = o.issuer.trim();
        const id = isoDateOnly(o.issueDate);
        const ed = isoDateOnly(o.expiryDate);
        if (id) entry.issueDate = id;
        if (ed) entry.expiryDate = ed;
        return entry.name || entry.issuer ? entry : null;
      })
      .filter((x): x is UserCertificationEntry => x != null);
    if (out.certifications.length === 0) delete out.certifications;
  }
  if (Array.isArray(bi.languages) && bi.languages.length) {
    const levels = ['basic', 'intermediate', 'advanced', 'native'] as const;
    out.languages = bi.languages
      .map((l): UserLanguageEntry | null => {
        if (!l || typeof l !== 'object') return null;
        const o = l as Record<string, unknown>;
        const lang = typeof o.language === 'string' ? o.language.trim() : '';
        if (!lang) return null;
        const level =
          typeof o.level === 'string' && levels.includes(o.level as (typeof levels)[number])
            ? (o.level as UserLanguageEntry['level'])
            : undefined;
        return { language: lang, level };
      })
      .filter((x): x is UserLanguageEntry => x != null);
    if (out.languages.length === 0) delete out.languages;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function mapDocToUser(u: Record<string, unknown>, mergeBase?: User | null): User {
  const id = String(u._id ?? u.id ?? '');
  const st = u.status as Record<string, unknown> | undefined;
  const meta = u.metadata as Record<string, unknown> | undefined;
  const addr = u.address as Record<string, unknown> | undefined;
  const pi = u.personalInfo as Record<string, unknown> | undefined;
  const ec = pi?.emergencyContact as Record<string, unknown> | undefined;

  let dateOfBirth: string | undefined;
  if (typeof u.dateOfBirth === 'string' && u.dateOfBirth) {
    dateOfBirth = u.dateOfBirth.slice(0, 10);
  } else if (pi?.dateOfBirth) {
    const d = new Date(pi.dateOfBirth as string);
    if (!Number.isNaN(d.getTime())) dateOfBirth = d.toISOString().slice(0, 10);
  }

  let emergencyContact: User['emergencyContact'];
  if (u.emergencyContact && typeof u.emergencyContact === 'object') {
    const x = u.emergencyContact as Record<string, unknown>;
    emergencyContact = {
      name: x.name != null ? String(x.name) : '',
      phone: x.phone != null ? String(x.phone) : '',
      relationship: x.relationship != null ? String(x.relationship) : '',
    };
  } else if (ec) {
    emergencyContact = {
      name: ec.name != null ? String(ec.name) : '',
      phone: ec.phone != null ? String(ec.phone) : '',
      relationship: ec.relationship != null ? String(ec.relationship) : '',
    };
  }

  let address: User['address'];
  if (addr && (addr.street || addr.city || addr.state || addr.zipCode || addr.country)) {
    address = {
      street: addr.street != null ? String(addr.street) : '',
      city: addr.city != null ? String(addr.city) : '',
      state: addr.state != null ? String(addr.state) : '',
      zipCode: addr.zipCode != null ? String(addr.zipCode) : '',
      country: addr.country != null ? String(addr.country) : '',
    };
  }

  const rawTier = u.subscriptionTier;
  const subscriptionTier: User['subscriptionTier'] =
    rawTier === 'pro' || rawTier === 'free' ? rawTier : undefined;

  let subscriptionExpiresAt: string | null | undefined;
  if (u.subscriptionExpiresAt === null) {
    subscriptionExpiresAt = null;
  } else if (u.subscriptionExpiresAt != null && String(u.subscriptionExpiresAt).trim() !== '') {
    const d = new Date(String(u.subscriptionExpiresAt));
    subscriptionExpiresAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const resolvedUserType = resolveUserTypeFromDoc(u.userType, mergeBase);

  let hasProAccess: boolean | undefined;
  if (typeof u.hasProAccess === 'boolean') {
    hasProAccess = u.hasProAccess;
  } else if (resolvedUserType !== 'professional') {
    hasProAccess = true;
  } else if (subscriptionTier === 'free') {
    hasProAccess = false;
  } else if (subscriptionTier === 'pro') {
    if (subscriptionExpiresAt == null || subscriptionExpiresAt === undefined) {
      hasProAccess = true;
    } else {
      const end = new Date(subscriptionExpiresAt);
      hasProAccess = !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
    }
  } else {
    // Profesional sin datos de plan (perfil cacheado / backend antiguo): mismo criterio que servidor pre-migración.
    hasProAccess = true;
  }

  return {
    _id: id,
    id,
    fullName: String(u.fullName ?? ''),
    email: String(u.email ?? ''),
    phone: u.phone != null ? String(u.phone) : undefined,
    userType: resolvedUserType as User['userType'],
    subscriptionTier,
    subscriptionExpiresAt,
    hasProAccess,
    clientBookingRequiresDeposit:
      u.clientBookingRequiresDeposit === false
        ? false
        : u.clientBookingRequiresDeposit === true
          ? true
          : undefined,
    service: u.service != null ? String(u.service) : undefined,
    isActive: st ? st.isActive !== false : true,
    isEmailVerified: st ? !!st.emailVerified : !!u.isEmailVerified,
    profileImage:
      u.profileImage != null
        ? String(u.profileImage)
        : meta?.profilePicture != null
          ? String(meta.profilePicture)
          : undefined,
    createdAt: u.createdAt != null ? String(u.createdAt) : new Date().toISOString(),
    updatedAt: u.updatedAt != null ? String(u.updatedAt) : new Date().toISOString(),
    address,
    dateOfBirth,
    nationalId:
      u.nationalId != null
        ? String(u.nationalId)
        : pi?.nationalId != null
          ? String(pi.nationalId)
          : undefined,
    gender: (u.gender as User['gender']) || (pi?.gender as User['gender']) || undefined,
    emergencyContact,
    profileBio:
      u.profileBio != null
        ? String(u.profileBio)
        : meta?.bio != null
          ? String(meta.bio)
          : undefined,
    businessInfo: mapBusinessInfo(u.businessInfo),
  };
}

class ProfileService {
  private profileUrl(): string {
    return `${getBackendBaseUrl()}/api/users/profile/me`;
  }

  /**
   * Perfil tal como está en Mongo (incluye personalInfo, address, metadata).
   * Útil tras login: la respuesta de /auth/login solo expone getPublicProfile() y puede quedar corta.
   */
  async fetchProfileMe(token: string, opts?: { mergeBase?: User | null }): Promise<User> {
    const url = this.profileUrl();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.error === 'string' && json.error) ||
        `HTTP ${response.status}`;
      throw new Error(msg);
    }
    const raw = json.data ?? json.user;
    if (!raw || typeof raw !== 'object') {
      throw new Error('Respuesta de perfil inválida');
    }
    return mapDocToUser(raw as Record<string, unknown>, opts?.mergeBase ?? null);
  }

  async updateProfile(profileData: Partial<User>, token: string): Promise<User> {
    const url = this.profileUrl();
    console.log('📝 ProfileService PUT', url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const errArr = json.errors as Array<{ msg?: string }> | undefined;
      const firstVal =
        Array.isArray(errArr) && errArr[0] && typeof errArr[0].msg === 'string'
          ? errArr[0].msg
          : '';
      const msg =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.error === 'string' && json.error) ||
        `HTTP ${response.status}`;
      const details = typeof json.details === 'string' ? json.details.trim() : '';
      let out = msg;
      if (firstVal && !out.includes(firstVal)) out = `${out}\n${firstVal}`;
      if (details && !out.includes(details)) out = `${out}\n${details}`;
      throw new Error(out);
    }

    const raw = json.data ?? json.user;
    if (!raw || typeof raw !== 'object') {
      throw new Error('Respuesta de perfil inválida');
    }

    const user = mapDocToUser(raw as Record<string, unknown>);
    console.log('✅ Perfil sincronizado con backend:', user.email, user.service);
    return user;
  }
}

export const profileService = new ProfileService();
