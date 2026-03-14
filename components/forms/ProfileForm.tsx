'use client';

import { useState } from 'react';
import { AlumniProfile } from '@/types';
import Button from '@/components/ui/Button';

interface Props {
  profile: Partial<AlumniProfile>;
  onSubmit: (data: Partial<AlumniProfile>) => Promise<void>;
  loading?: boolean;
}

const programs = [
  'Teknik Informatika','Sistem Informasi','Manajemen','Akuntansi',
  'Hukum','Kedokteran','Psikologi','Ilmu Komunikasi',
];
const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

export default function ProfileForm({ profile, onSubmit, loading }: Props) {
  const [form, setForm] = useState<Partial<AlumniProfile>>(profile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="label-base">Full Name *</label>
          <input name="full_name" value={form.full_name || ''} onChange={handleChange} className="input-base" required />
        </div>
        <div>
          <label className="label-base">NIM (Student ID) *</label>
          <input name="nim" value={form.nim || ''} onChange={handleChange} className="input-base" required />
        </div>
        <div>
          <label className="label-base">Study Program *</label>
          <select name="study_program" value={form.study_program || ''} onChange={handleChange} className="input-base" required>
            <option value="">Select program</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label-base">Graduation Year *</label>
          <select name="graduation_year" value={form.graduation_year || ''} onChange={handleChange} className="input-base" required>
            <option value="">Select year</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label-base">LinkedIn URL</label>
          <input name="linkedin_url" type="url" value={form.linkedin_url || ''} onChange={handleChange} className="input-base" placeholder="https://linkedin.com/in/username" />
        </div>
        <div className="md:col-span-2">
          <label className="label-base">Photo URL</label>
          <input name="photo_url" type="url" value={form.photo_url || ''} onChange={handleChange} className="input-base" placeholder="https://..." />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>Save Profile</Button>
      </div>
    </form>
  );
}
