'use client';

import { CareerMilestone } from '@/types';
import { formatDate, classificationLabel } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Building2, CalendarDays, Briefcase } from 'lucide-react';

interface Props {
  milestone: CareerMilestone;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  isAlumniView?: boolean;
}

export default function MilestoneValidationCard({ milestone, onConfirm, onReject, isAlumniView }: Props) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{milestone.position_title}</h3>
            <Badge status={milestone.verification_status} />
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {milestone.company_name}
            </p>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {formatDate(milestone.start_date)}
            </p>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {classificationLabel(milestone.classification_label)}
            </p>
          </div>
        </div>

        {isAlumniView && milestone.verification_status === 'pending' && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button size="sm" variant="success" onClick={() => onConfirm?.(milestone.id)}>
              Confirm
            </Button>
            <Button size="sm" variant="danger" onClick={() => onReject?.(milestone.id)}>
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
