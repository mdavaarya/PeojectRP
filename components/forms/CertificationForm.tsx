'use client';

import { useState } from 'react';
import { SkillCertification } from '@/types';
import Button from '@/components/ui/Button';

interface Props {
  onSubmit: (data: Partial<SkillCertification>) => Promise<void>;
  loading?: boolean;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function CertificationForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<Partial<SkillCertification>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, year: Number(form.year) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-base">Certificate Name *</label>
        <input name="certificate_name" value={form.certificate_name || ''} onChange={handleChange} className="input-base" required />
      </div>
      <div>
        <label className="label-base">Issuer / Organization *</label>
        <input name="issuer" value={form.issuer || ''} onChange={handleChange} className="input-base" required />
      </div>
      <div>
        <label className="label-base">Year *</label>
        <select name="year" value={form.year || ''} onChange={handleChange} className="input-base" required>
          <option value="">Select year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>Add Certification</Button>
      </div>
    </form>
  );
}
