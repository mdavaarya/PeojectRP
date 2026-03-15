import { ClassificationLabel, VerificationStatus } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function classificationLabel(label: ClassificationLabel): string {
  const map: Record<ClassificationLabel, string> = {
    entry_level:  'Entry Level',
    mid_level:    'Mid Level',
    senior_level: 'Senior Level',
    manager:      'Manager',
    director:     'Director',
    executive:    'Executive',
    entrepreneur: 'Entrepreneur',
    other:        'Other',
  };
  return map[label] ?? label;
}

export function statusColor(status: VerificationStatus): string {
  const map: Record<VerificationStatus, string> = {
    pending:  'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return map[status];
}

// Daftar hostname yang diizinkan di next.config.js
const ALLOWED_HOSTS = [
  'supabase.co',
  'ui-avatars.com',
  'github.com',
  'avatars.githubusercontent.com',
  'media.licdn.com',
  'linkedin.com',
  'lh3.googleusercontent.com',
  'i.imgur.com',
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

export function avatarUrl(name: string, photoUrl?: string): string {
  // Kalau photo_url ada dan hostnya diizinkan, gunakan langsung
  if (photoUrl && isAllowedImageUrl(photoUrl)) return photoUrl;

  // Fallback ke ui-avatars (selalu aman)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1e40af&color=fff&size=128`;
}