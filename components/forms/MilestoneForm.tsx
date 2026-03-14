'use client';

import { useState } from 'react';
import { CareerMilestone, ClassificationLabel } from '@/types';
import Button from '@/components/ui/Button';

interface Props {
  onSubmit: (data: Partial<CareerMilestone>) => Promise<void>;
  loading?: boolean;
  initial?: Partial<CareerMilestone>;
}

const classifications: { value: ClassificationLabel; label: string }[] = [
  { value: 'entry_level', label: 'Entry Level' },
  { value: 'mid_level', label: 'Mid Level' },
  { value: 'senior_level', label: 'Senior Level' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'executive', label: 'Executive' },
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'other', label: 'Other' },
];

export default function MilestoneForm({ onSubmit, loading, initial = {} }: Props) {
  const [form, setForm] = useState<Partial<CareerMilestone>>(initial);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, verification_status: 'pending' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-base">Company Name *</label>
        <input name="company_name" value={form.company_name || ''} onChange={handleChange} className="input-base" required />
      </div>
      <div>
        <label className="label-base">Position Title *</label>
        <input name="position_title" value={form.position_title || ''} onChange={handleChange} className="input-base" required />
      </div>
      <div>
        <label className="label-base">Start Date *</label>
        <input name="start_date" type="date" value={form.start_date || ''} onChange={handleChange} className="input-base" required />
      </div>
      <div>
        <label className="label-base">Classification *</label>
        <select name="classification_label" value={form.classification_label || ''} onChange={handleChange} className="input-base" required>
          <option value="">Select classification</option>
          {classifications.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>Submit Milestone</Button>
      </div>
    </form>
  );
}
