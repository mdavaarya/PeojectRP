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
const START_YEAR = 2000;
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - START_YEAR + 1 }, (_, i) => currentYear - i);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Data Akademik */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">Data Akademik</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-base">Nama Lengkap *</label>
            <input name="full_name" value={form.full_name || ''} onChange={handleChange} className="input-base" required />
          </div>
          <div>
            <label className="label-base">NIM *</label>
            <input name="nim" value={form.nim || ''} onChange={handleChange} className="input-base" required />
          </div>
          <div>
            <label className="label-base">Program Studi *</label>
            <select name="study_program" value={form.study_program || ''} onChange={handleChange} className="input-base" required>
              <option value="">Pilih program studi</option>
              {programs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Tahun Lulus *</label>
            <select name="graduation_year" value={form.graduation_year || ''} onChange={handleChange} className="input-base" required>
              <option value="">Pilih tahun</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Kontak & Pekerjaan */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">Kontak & Pekerjaan</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-base">No. HP / WhatsApp</label>
            <input name="phone_number" type="tel" value={form.phone_number || ''} onChange={handleChange} className="input-base" placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label className="label-base">Status Pekerjaan</label>
            <select name="employment_sector" value={form.employment_sector || ''} onChange={handleChange} className="input-base">
              <option value="">Pilih status</option>
              <option value="PNS">PNS</option>
              <option value="Swasta">Swasta</option>
              <option value="Wirausaha">Wirausaha</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      {/* Media Sosial */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">Media Sosial</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-base">LinkedIn URL</label>
            <input name="linkedin_url" type="url" value={form.linkedin_url || ''} onChange={handleChange} className="input-base" placeholder="https://linkedin.com/in/username" />
          </div>
          <div>
            <label className="label-base">Instagram</label>
            <input name="instagram_url" type="url" value={form.instagram_url || ''} onChange={handleChange} className="input-base" placeholder="https://instagram.com/username" />
          </div>
          <div>
            <label className="label-base">Facebook</label>
            <input name="facebook_url" type="url" value={form.facebook_url || ''} onChange={handleChange} className="input-base" placeholder="https://facebook.com/username" />
          </div>
          <div>
            <label className="label-base">TikTok</label>
            <input name="tiktok_url" type="url" value={form.tiktok_url || ''} onChange={handleChange} className="input-base" placeholder="https://tiktok.com/@username" />
          </div>
          <div className="md:col-span-2">
            <label className="label-base">Foto Profil (URL)</label>
            <input name="photo_url" type="url" value={form.photo_url || ''} onChange={handleChange} className="input-base" placeholder="https://..." />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>Simpan Profil</Button>
      </div>
    </form>
  );
}