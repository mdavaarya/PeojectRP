'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { SearchProfile } from '@/types';
import toast from 'react-hot-toast';
import { Search, Plus, Edit, AlertTriangle, Lock, Unlock, Wand2 } from 'lucide-react';

export default function AdminSearchProfilesPage() {
  const [profiles, setProfiles]     = useState<SearchProfile[]>([]);
  const [filtered, setFiltered]     = useState<SearchProfile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState('');
  const [selected, setSelected]     = useState<SearchProfile | null>(null);
  const [showEdit, setShowEdit]     = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/search-profiles')
      .then(r => r.json())
      .then(data => { setProfiles(data); setFiltered(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(
      profiles.filter(p => {
        const alumni = (p as any).alumni_profiles;
        return (
          alumni?.full_name?.toLowerCase().includes(q) ||
          alumni?.nim?.toLowerCase().includes(q) ||
          alumni?.study_program?.toLowerCase().includes(q)
        );
      })
    );
  }, [query, profiles]);

  const handleBulkCreate = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/search-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true }),
      });
      const data = await res.json();
      toast.success(`${data.created} profil dibuat, ${data.skipped} sudah ada`);
      // Reload
      const updated = await fetch('/api/admin/search-profiles').then(r => r.json());
      setProfiles(updated); setFiltered(updated);
    } catch {
      toast.error('Gagal membuat profil');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleToggleOptOut = async (profile: SearchProfile) => {
    const newState = !profile.is_opted_out;
    const reason   = newState ? prompt('Alasan opt-out (opsional):') ?? undefined : undefined;
    try {
      await fetch('/api/admin/search-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumni_id: profile.alumni_id, opt_out: newState, opt_out_reason: reason }),
      });
      setProfiles(prev =>
        prev.map(p => p.alumni_id === profile.alumni_id ? { ...p, is_opted_out: newState } : p)
      );
      toast.success(newState ? 'Alumni di-opt-out dari tracking' : 'Opt-out dicabut');
    } catch {
      toast.error('Gagal update');
    }
  };

  const columns = [
    {
      key: 'alumni',
      label: 'Alumni',
      render: (p: SearchProfile) => {
        const a = (p as any).alumni_profiles;
        return (
          <div>
            <p className="font-medium text-sm text-gray-900">{a?.full_name ?? '-'}</p>
            <p className="text-xs text-gray-400">{a?.study_program} · {a?.graduation_year}</p>
          </div>
        );
      },
    },
    {
      key: 'name_variants',
      label: 'Variasi Nama',
      render: (p: SearchProfile) => (
        <div className="flex flex-wrap gap-1">
          {p.name_variants.slice(0, 3).map((v, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              {v}
            </span>
          ))}
          {p.name_variants.length > 3 && (
            <span className="text-xs text-gray-400">+{p.name_variants.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'flags',
      label: 'Flag',
      render: (p: SearchProfile) => (
        <div className="flex gap-1.5">
          {p.is_low_context && (
            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Low Context
            </span>
          )}
          {p.is_opted_out && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Opt-out
            </span>
          )}
          {!p.is_low_context && !p.is_opted_out && (
            <span className="text-xs text-green-600">✓ Siap</span>
          )}
        </div>
      ),
    },
    {
      key: 'keywords',
      label: 'Kata Kunci Konteks',
      render: (p: SearchProfile) => (
        <p className="text-xs text-gray-500 truncate max-w-[180px]">
          {p.context_keywords.slice(0, 3).join(', ')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (p: SearchProfile) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setSelected(p); setShowEdit(true); }}>
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant={p.is_opted_out ? 'success' : 'ghost'}
            onClick={() => handleToggleOptOut(p)}
          >
            {p.is_opted_out
              ? <><Unlock className="w-3.5 h-3.5 mr-1" /> Aktifkan</>
              : <><Lock className="w-3.5 h-3.5 mr-1" /> Opt-out</>
            }
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="Search Profiles" userName="Administrator" />
      <div className="p-6 space-y-5">

        {/* Info banner */}
        <Card className="bg-primary-50 border-primary-200">
          <div className="flex items-start gap-3">
            <Wand2 className="w-5 h-5 text-primary-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary-900 text-sm">Apa itu Search Profile?</p>
              <p className="text-primary-700 text-xs mt-0.5">
                Setiap alumni memiliki "profil pencarian" berisi variasi nama, kata kunci afiliasi, dan konteks.
                Profil ini digunakan sistem untuk menghasilkan query pencarian yang akurat ke sumber publik.
                Alumni dengan flag <strong>Low Context</strong> memiliki nama yang terlalu umum — perlu ditambah kata kunci konteks secara manual.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-base pl-9"
              placeholder="Cari alumni..."
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleBulkCreate} loading={bulkLoading}>
              <Plus className="w-4 h-4 mr-1.5" /> Generate Semua
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Profil',  value: profiles.length,                                   color: 'text-gray-700' },
            { label: 'Siap Lacak',   value: profiles.filter(p => !p.is_opted_out && !p.is_low_context).length, color: 'text-green-600' },
            { label: 'Low Context',  value: profiles.filter(p => p.is_low_context).length,     color: 'text-yellow-600' },
            { label: 'Opt-out',      value: profiles.filter(p => p.is_opted_out).length,       color: 'text-red-500' },
          ].map(s => (
            <Card key={s.label} className="text-center py-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card padding={false}>
          <Table
            columns={columns}
            data={filtered}
            keyField="id"
            loading={loading}
            emptyMessage="Belum ada search profile. Klik 'Generate Semua' untuk membuat otomatis."
          />
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Search Profile"
        size="lg"
      >
        {selected && (
          <SearchProfileEditForm
            profile={selected}
            onSave={async (updates) => {
              try {
                const res = await fetch('/api/admin/search-profiles', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ alumni_id: selected.alumni_id, ...updates }),
                });
                if (!res.ok) throw new Error('Gagal menyimpan');
                const updated = await res.json();
                setProfiles(prev => prev.map(p => p.alumni_id === selected.alumni_id ? { ...p, ...updated } : p));
                setShowEdit(false);
                toast.success('Search profile diperbarui');
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}

// ── Edit form component ────────────────────────────────────────────────────

function SearchProfileEditForm({
  profile,
  onSave,
}: {
  profile: SearchProfile;
  onSave: (data: any) => Promise<void>;
}) {
  const [nameVariants,        setNameVariants]        = useState(profile.name_variants.join('\n'));
  const [affiliationKeywords, setAffiliationKeywords] = useState(profile.affiliation_keywords.join('\n'));
  const [contextKeywords,     setContextKeywords]     = useState(profile.context_keywords.join('\n'));
  const [isLowContext,        setIsLowContext]         = useState(profile.is_low_context);
  const [lowContextReason,    setLowContextReason]    = useState(profile.low_context_reason ?? '');
  const [saving, setSaving] = useState(false);

  const alumni = (profile as any).alumni_profiles;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name_variants:        nameVariants.split('\n').map(s => s.trim()).filter(Boolean),
      affiliation_keywords: affiliationKeywords.split('\n').map(s => s.trim()).filter(Boolean),
      context_keywords:     contextKeywords.split('\n').map(s => s.trim()).filter(Boolean),
      is_low_context:       isLowContext,
      low_context_reason:   lowContextReason || null,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {alumni && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-semibold text-gray-900">{alumni.full_name}</p>
          <p className="text-gray-500">{alumni.study_program} · {alumni.graduation_year}</p>
        </div>
      )}

      <div>
        <label className="label-base">Variasi Nama <span className="text-gray-400 font-normal">(satu per baris)</span></label>
        <textarea
          value={nameVariants}
          onChange={e => setNameVariants(e.target.value)}
          className="input-base font-mono text-xs"
          rows={5}
        />
        <p className="text-xs text-gray-400 mt-1">Contoh: Muhammad Rizky, M. Rizky, Rizky M.</p>
      </div>

      <div>
        <label className="label-base">Kata Kunci Afiliasi <span className="text-gray-400 font-normal">(satu per baris)</span></label>
        <textarea
          value={affiliationKeywords}
          onChange={e => setAffiliationKeywords(e.target.value)}
          className="input-base font-mono text-xs"
          rows={4}
        />
        <p className="text-xs text-gray-400 mt-1">Contoh: Universitas Muhammadiyah Malang, UMM, Teknik Informatika</p>
      </div>

      <div>
        <label className="label-base">Kata Kunci Konteks <span className="text-gray-400 font-normal">(satu per baris)</span></label>
        <textarea
          value={contextKeywords}
          onChange={e => setContextKeywords(e.target.value)}
          className="input-base font-mono text-xs"
          rows={4}
        />
        <p className="text-xs text-gray-400 mt-1">Contoh: software engineer, malang, angkatan 2020</p>
      </div>

      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
        <input
          type="checkbox"
          id="low_context"
          checked={isLowContext}
          onChange={e => setIsLowContext(e.target.checked)}
          className="mt-0.5"
        />
        <div>
          <label htmlFor="low_context" className="text-sm font-medium text-yellow-800 cursor-pointer">
            Tandai sebagai Low Context
          </label>
          <p className="text-xs text-yellow-600 mt-0.5">
            Aktifkan jika nama alumni terlalu umum dan hasil pencarian akan noisy.
          </p>
          {isLowContext && (
            <input
              value={lowContextReason}
              onChange={e => setLowContextReason(e.target.value)}
              className="input-base mt-2 text-xs"
              placeholder="Alasan (contoh: nama sangat umum, hanya satu kata)"
            />
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={saving}>Simpan Perubahan</Button>
      </div>
    </div>
  );
}
