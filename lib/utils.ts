import { ClassificationLabel, VerificationStatus } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function classificationLabel(label: ClassificationLabel): string {
  const map: Record<ClassificationLabel, string> = {
    entry_level: 'Entry Level',
    mid_level: 'Mid Level',
    senior_level: 'Senior Level',
    manager: 'Manager',
    director: 'Director',
    executive: 'Executive',
    entrepreneur: 'Entrepreneur',
    other: 'Other',
  };
  return map[label] ?? label;
}

export function statusColor(status: VerificationStatus): string {
  const map: Record<VerificationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return map[status];
}

export function avatarUrl(name: string, photoUrl?: string): string {
  if (photoUrl) return photoUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff&size=128`;
}
