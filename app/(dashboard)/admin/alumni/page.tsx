'use client';

import { useEffect, useState } from 'react';
import { AlumniProfile } from '@/types';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import { Trash2, Eye, Search, Users, Phone, Briefcase } from 'lucide-react';
import { avatarUrl } from '@/lib/utils';
import Image from 'next/image';

const PAGE_SIZE = 15;

export default function AdminAlumniPage() {
  const [alumni,   setAlumni]   = useState<AlumniProfile[]>([]);
  const [filtered, setFiltered] = useState<AlumniProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState<AlumniProfile | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [certs,      setCerts]      = useState<any[]>([]);

  const { currentPage, totalPages, paginated, setPage } = usePagination(filtered, PAGE_SIZE);

  useEffect(() => {
    fetch('/api/admin/alumni')
      .then(r => r.json())
      .then(data => { setAlumni(data); setFiltered(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(
      alumni.filter(a =>
        a.full_name?.toLowerCase().includes(q) ||
        a.nim?.toLowerCase().includes(q) ||
        a.study_program?.toLowerCase().includes(q)
      )
    );
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, alumni]);

  const handleView = async (a: AlumniProfile) => {
    setSelected(a);
    setShowDetail(true);
    const [msRes, certRes] = await Promise.all([
      fetch(`/api/alumni/milestones?alumni_id=${a.id}`).then(r => r.json()),
      fetch(`/api/alumni/milestones?type=certs&alumni_id=${a.id}`).then(r => r.json()).catch(() => []),
    ]);
    setMilestones(Array.isArray(msRes) ? msRes : []);
    setCerts(Array.isArray(certRes) ? certRes : []);
  };

  const handleDelete = async (a: AlumniProfile) => {
    if (!confirm(`Hapus ${a.full_name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch('/api/admin/alumni', {
        method: 'DELETE',
        body: JSON.stringify({ alumni_id: a.id, user_id: a.user_id }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      setAlumni(prev => prev.filter(x => x.id !== a.id));
      toast.success(`${a.full_name} dihapus`);
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const sectorBadge = (sector?: string) => {
    if (!sector) return null;
    const colors: Record<string, string> = {
      PNS:      'bg-blue-100 text-blue-700',
      Swasta:   'bg-purple-100 text-purple-700',
      Wirausaha:'bg-orange-100 text-orange-700',
      Lainnya:  'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[sector] || 'bg-gray-100 text-gray-600'}`}>
        {sector}
      </span>
    );
  };

  const columns = [
    {
      key: 'full_name', label: 'Alumni',
      render: (row: AlumniProfile) => (
        <div className="flex items-center gap-3">
          <Image src={avatarUrl(row.full_name, row.photo_url)} alt={row.full_name} width={32} height={32} className="rounded-full" />
          <div>
            <p className="font-medium text-gray-900">{row.full_name}</p>
            <p className="text-xs text-gray-400">{row.nim}</p>
          </div>
        </div>
      ),
    },
    { key: 'study_program', label: 'Program' },
    { key: 'graduation_year', label: 'Angkatan' },
    {
      key: 'phone_number', label: 'No. HP',
      render: (row: AlumniProfile) => (
        <span className="text-sm text-gray-600">{row.phone_number || <span className="text-gray-300">-</span>}</span>
      ),
    },
    {
      key: 'employment_sector', label: 'Status Kerja',
      render: (row: AlumniProfile) => sectorBadge(row.employment_sector) || <span className="text-gray-300 text-xs">-</span>,
    },
    {
      key: 'actions', label: 'Aksi',
      render: (row: AlumniProfile) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleView(row)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Detail
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="Manajemen Alumni" userName="Administrator" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {filtered.length} alumni
              {query && <span className="text-gray-400"> (filter aktif)</span>}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-base pl-9 w-64"
              placeholder="Cari nama, NIM, program..."
            />
          </div>
        </div>

        <Card padding={false}>
          <Table columns={columns} data={paginated} keyField="id" loading={loading} emptyMessage="Belum ada data alumni" />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            itemsPerPage={PAGE_SIZE}
          />
        </Card>
      </div>

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`${selected?.full_name} – Detail`} size="lg">
        {selected && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Akademik</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">NIM:</span> <span className="font-medium">{selected.nim}</span></div>
                <div><span className="text-gray-500">Program:</span> <span className="font-medium">{selected.study_program}</span></div>
                <div><span className="text-gray-500">Lulus:</span> <span className="font-medium">{selected.graduation_year}</span></div>
                <div><span className="text-gray-500">Status:</span> {sectorBadge(selected.employment_sector) || <span className="text-gray-400">-</span>}</div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kontak</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selected.phone_number || <span className="text-gray-400">-</span>}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Media Sosial</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                {selected.linkedin_url  && <a href={selected.linkedin_url}  target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline px-2 py-1 bg-blue-50 rounded-md text-xs">LinkedIn →</a>}
                {selected.instagram_url && <a href={selected.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline px-2 py-1 bg-pink-50 rounded-md text-xs">Instagram →</a>}
                {selected.facebook_url  && <a href={selected.facebook_url}  target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline px-2 py-1 bg-blue-50 rounded-md text-xs">Facebook →</a>}
                {selected.tiktok_url    && <a href={selected.tiktok_url}    target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline px-2 py-1 bg-gray-100 rounded-md text-xs">TikTok →</a>}
                {!selected.linkedin_url && !selected.instagram_url && !selected.facebook_url && !selected.tiktok_url && (
                  <span className="text-gray-400 text-xs">Belum ada data sosial media</span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <Briefcase className="w-3.5 h-3.5 inline mr-1" />
                Career Milestones ({milestones.length})
              </h4>
              {milestones.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {milestones.map((m: any) => (
                    <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{m.position_title} @ {m.company_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          m.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                          m.verification_status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{m.verification_status}</span>
                      </div>
                      {m.work_address && <p className="text-xs text-gray-500 mt-1">📍 {m.work_address}</p>}
                      {m.company_social_media && (
                        <a href={m.company_social_media} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-0.5 block">🔗 {m.company_social_media}</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sertifikasi ({certs.length})</h4>
              {certs.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {certs.map((c: any) => (
                    <div key={c.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                      {c.certificate_name} – {c.issuer} ({c.year})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}