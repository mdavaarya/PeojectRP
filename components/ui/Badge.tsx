import { cn } from '@/lib/utils';
import { VerificationStatus } from '@/types';

interface BadgeProps {
  status: VerificationStatus;
  className?: string;
}

const config: Record<VerificationStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  verified: { label: 'Verified', classes: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800 border-red-200' },
};

export default function Badge({ status, className }: BadgeProps) {
  const { label, classes } = config[status];
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', classes, className)}>
      {label}
    </span>
  );
}
