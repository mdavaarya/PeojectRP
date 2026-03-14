'use client';

import { useEffect, useState } from 'react';
import { AlumniProfile } from '@/types';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Trash2, Eye, Search, Users } from 'lucide-react';
import { avatarUrl } from '@/lib/utils';
import Image from 'next/image';

export default function AdminAlumniPage() {
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [filtered, setFiltered] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AlumniProfile | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);

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
    if (!confirm(`Delete ${a.full_name}? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/alumni', {
        method: 'DELETE',
        body: JSON.stringify({ alumni_id: a.id, user_id: a.user_id }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      setAlumni(prev => prev.filter(x => x.id !== a.id));
      toast.success(`${a.full_name} deleted`);
    } catch {
      toast.error('Delete failed');
    }
  };

  const columns = [
    {
      key: 'full_name',
      label: 'Alumni',
      render: (row: AlumniProfile) => (
        <div className="flex items-center gap-3">
          <Image
            src={avatarUrl(row.full_name, row.photo_url)}
            alt={row.full_name}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900">{row.full_name}</p>
            <p className="text-xs text-gray-400">{row.nim}</p>
          </div>
        </div>
      ),
    },
    { key: 'study_program', label: 'Program' },
    { key: 'graduation_year', label: 'Year' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: AlumniProfile) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleView(row)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> View
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
      <Header title="Alumni Management" userName="Administrator" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-4 h-4" />
            <span className="text-sm">{filtered.length} alumni</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-base pl-9 w-64"
              placeholder="Search alumni..."
            />
          </div>
        </div>

        <Card padding={false}>
          <Table
            columns={columns}
            data={filtered}
            keyField="id"
            loading={loading}
            emptyMessage="No alumni found"
          />
        </Card>
      </div>

      <Modal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={`${selected?.full_name} – Details`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">NIM:</span> <span className="font-medium">{selected.nim}</span></div>
              <div><span className="text-gray-500">Program:</span> <span className="font-medium">{selected.study_program}</span></div>
              <div><span className="text-gray-500">Graduation:</span> <span className="font-medium">{selected.graduation_year}</span></div>
              {selected.linkedin_url && (
                <div>
                  <a href={selected.linkedin_url} className="text-primary-600 hover:underline text-xs" target="_blank">
                    LinkedIn →
                  </a>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Career Milestones ({milestones.length})</h4>
              {milestones.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <div className="space-y-2">
                  {milestones.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <span>{m.position_title} @ {m.company_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        m.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                        m.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{m.verification_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Certifications ({certs.length})</h4>
              {certs.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
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
