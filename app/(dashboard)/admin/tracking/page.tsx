'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import { Card, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { TrackingJob, TrackingResult } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Play, RefreshCw, Clock, CheckCircle, AlertTriangle,
  XCircle, Eye, Users, BarChart3, Zap, Activity
} from 'lucide-react';

export default function AdminTrackingPage() {
  const [jobs, setJobs]             = useState<TrackingJob[]>([]);
  const [results, setResults]       = useState<TrackingResult[]>([]);
  const [selected, setSelected]     = useState<TrackingResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [running, setRunning]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [jobsRes, resultsRes] = await Promise.all([
        fetch('/api/tracking/jobs').then(r => r.json()),
        fetch('/api/tracking/results').then(r => r.json()),
      ]);
      const jobList: TrackingJob[]       = Array.isArray(jobsRes)     ? jobsRes     : [];
      const resultList: TrackingResult[] = Array.isArray(resultsRes)  ? resultsRes  : [];
      setJobs(jobList);
      setResults(resultList);
      setLoading(false);

      // Hentikan polling jika tidak ada job yang running
      const hasRunning = jobList.some(j => j.status === 'running');
      if (!hasRunning && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup interval saat component unmount
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  // Mulai polling HANYA saat ada job running
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // sudah polling
    intervalRef.current = setInterval(loadData, 5000);
  }, [loadData]);

  const handleRunJob = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tracking/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Job dimulai! ID: ${data.job_id?.slice(0, 8)}...`);
      await loadData();
      startPolling(); // mulai polling karena ada job baru
    } catch (err: any) {
      toast.error(err.message || 'Gagal menjalankan job');
    } finally {
      setRunning(false);
    }
  };

  // Stats dihitung langsung dari data yang ada
  const stats = {
    total:       results.length,
    identified:  results.filter(r => r.tracking_status === 'identified').length,
    needsReview: results.filter(r => r.tracking_status === 'needs_review').length,
    notFound:    results.filter(r => r.tracking_status === 'not_found').length,
    optedOut:    results.filter(r => r.tracking_status === 'opted_out').length,
  };

  const statusIcon = (status: string) => {
    if (status === 'identified')   return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'needs_review') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (status === 'not_found')    return <XCircle className="w-4 h-4 text-gray-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const jobBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      running:   'bg-blue-100 text-blue-700',
      failed:    'bg-red-100 text-red-700',
      pending:   'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? map.pending}`}>
        {status}
      </span>
    );
  };

  const resultColumns = [
    {
      key: 'alumni',
      label: 'Alumni',
      render: (r: TrackingResult) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {(r as any).alumni_profiles?.full_name ?? '-'}
          </p>
          <p className="text-xs text-gray-400">
            {(r as any).alumni_profiles?.study_program} · {(r as any).alumni_profiles?.graduation_year}
          </p>
        </div>
      ),
    },
    {
      key: 'tracking_status',
      label: 'Status',
      render: (r: TrackingResult) => (
        <div className="flex items-center gap-1.5">
          {statusIcon(r.tracking_status)}
          <span className="text-sm capitalize">{r.tracking_status.replace('_', ' ')}</span>
        </div>
      ),
    },
    {
      key: 'confidence_score',
      label: 'Confidence',
      render: (r: TrackingResult) => (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                r.confidence_score >= 0.75 ? 'bg-green-500' :
                r.confidence_score >= 0.40 ? 'bg-yellow-400' : 'bg-gray-300'
              }`}
              style={{ width: `${Math.round(r.confidence_score * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{Math.round(r.confidence_score * 100)}%</span>
        </div>
      ),
    },
    {
      key: 'found',
      label: 'Ditemukan',
      render: (r: TrackingResult) => (
        <div className="text-sm">
          {r.found_position ? (
            <>
              <p className="text-gray-800">{r.found_position}</p>
              <p className="text-gray-400 text-xs">{r.found_company}</p>
            </>
          ) : <span className="text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key: 'sources',
      label: 'Sumber',
      render: (r: TrackingResult) => (
        <div className="flex flex-wrap gap-1">
          {(r.supporting_sources ?? []).slice(0, 3).map(s => (
            <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'confirmation',
      label: 'Konfirmasi',
      render: (r: TrackingResult) => {
        if (!r.alumni_confirmation) return <span className="text-gray-300 text-sm">—</span>;
        const map: Record<string, string> = {
          confirmed: 'bg-green-100 text-green-700',
          rejected:  'bg-red-100 text-red-700',
          pending:   'bg-yellow-100 text-yellow-700',
        };
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[r.alumni_confirmation] ?? ''}`}>
            {r.alumni_confirmation}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (r: TrackingResult) => (
        <Button size="sm" variant="ghost" onClick={() => { setSelected(r); setShowDetail(true); }}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <Header title="Tracking Monitor" userName="Administrator" />
      <div className="p-6 space-y-6">

        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pelacakan Alumni Otomatis</h2>
            <p className="text-sm text-gray-500 mt-0.5">Jadwal otomatis: setiap Senin 02:00 UTC via Vercel Cron</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            <Button onClick={handleRunJob} loading={running}>
              <Play className="w-4 h-4 mr-1.5" /> Jalankan Sekarang
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Dilacak"    value={stats.total}       icon={<Users className="w-5 h-5" />} />
          <StatCard label="Teridentifikasi"  value={stats.identified}  icon={<CheckCircle className="w-5 h-5" />} color="text-green-600" />
          <StatCard label="Perlu Review"     value={stats.needsReview} icon={<AlertTriangle className="w-5 h-5" />} color="text-yellow-600" />
          <StatCard label="Tidak Ditemukan"  value={stats.notFound}    icon={<XCircle className="w-5 h-5" />} color="text-gray-500" />
          <StatCard label="Opt-out"          value={stats.optedOut}    icon={<Activity className="w-5 h-5" />} color="text-red-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job history */}
          <Card className="lg:col-span-1">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-600" /> Riwayat Job
            </h3>
            {loading ? (
              <p className="text-gray-400 text-sm text-center py-4">Memuat...</p>
            ) : jobs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Belum ada job</p>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 8).map(job => (
                  <div key={job.id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {jobBadge(job.status)}
                        <span className="text-xs text-gray-400 capitalize">{job.triggered_by}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{job.processed}/{job.total_alumni} alumni</p>
                      <p className="text-xs text-gray-400">{formatDate(job.created_at)}</p>
                    </div>
                    <div className="text-right text-xs flex-shrink-0">
                      <p className="text-green-600 font-medium">{job.identified} ✓</p>
                      <p className="text-yellow-600">{job.needs_review} ~</p>
                      <p className="text-gray-400">{job.not_found} ✗</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Distribution chart */}
          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600" /> Distribusi Status Pelacakan
            </h3>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Belum ada data tracking</p>
                <p className="text-gray-300 text-xs mt-1">
                  Pastikan alumni sudah terdaftar, generate Search Profiles, lalu jalankan job
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: 'identified',   label: 'Teridentifikasi', color: 'bg-green-500',  count: stats.identified },
                  { key: 'needs_review', label: 'Perlu Review',    color: 'bg-yellow-400', count: stats.needsReview },
                  { key: 'not_found',    label: 'Tidak Ditemukan', color: 'bg-gray-300',   count: stats.notFound },
                  { key: 'opted_out',    label: 'Opt-out',         color: 'bg-red-300',    count: stats.optedOut },
                ].map(({ key, label, color, count }) => {
                  const pct = results.length ? Math.round((count / results.length) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Results table */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Hasil Pelacakan Terbaru</h3>
            <span className="text-xs text-gray-400">{results.length} alumni</span>
          </div>
          <Table
            columns={resultColumns}
            data={results}
            keyField="id"
            loading={loading}
            emptyMessage="Belum ada hasil tracking. Generate Search Profiles dulu, lalu jalankan tracking job."
          />
        </Card>
      </div>

      {/* Detail modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Detail Hasil Tracking" size="lg">
        {selected && <TrackingResultDetail result={selected} />}
      </Modal>
    </>
  );
}

function TrackingResultDetail({ result }: { result: TrackingResult }) {
  const confidence = Math.round(result.confidence_score * 100);
  const evidences  = (result as any).tracking_evidence ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Alumni:</span> <span className="font-medium">{(result as any).alumni_profiles?.full_name ?? '-'}</span></div>
        <div><span className="text-gray-500">Prodi:</span> <span className="font-medium">{(result as any).alumni_profiles?.study_program ?? '-'}</span></div>
        <div><span className="text-gray-500">Status:</span> <span className="font-medium capitalize">{result.tracking_status.replace('_', ' ')}</span></div>
        <div>
          <span className="text-gray-500">Confidence: </span>
          <span className={`font-bold ${confidence >= 75 ? 'text-green-600' : confidence >= 40 ? 'text-yellow-600' : 'text-gray-500'}`}>
            {confidence}%
          </span>
        </div>
      </div>

      {result.found_position && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
          <p className="font-semibold text-green-800 mb-2">Informasi Karir Ditemukan</p>
          {result.found_position && <p><span className="text-gray-500">Posisi:</span> {result.found_position}</p>}
          {result.found_company  && <p><span className="text-gray-500">Instansi:</span> {result.found_company}</p>}
          {result.found_location && <p><span className="text-gray-500">Lokasi:</span> {result.found_location}</p>}
          {result.found_year     && <p><span className="text-gray-500">Tahun:</span> {result.found_year}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Sumber Pendukung</p>
          <div className="flex flex-wrap gap-1">
            {result.supporting_sources?.length
              ? result.supporting_sources.map(s => (
                  <span key={s} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                ))
              : <span className="text-xs text-gray-400">—</span>
            }
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Sumber Konflik</p>
          <div className="flex flex-wrap gap-1">
            {result.conflicting_sources?.length
              ? result.conflicting_sources.map(s => (
                  <span key={s} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{s}</span>
                ))
              : <span className="text-xs text-gray-400">—</span>
            }
          </div>
        </div>
      </div>

      {evidences.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Bukti ({evidences.length})</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {evidences.map((e: any) => (
              <div key={e.id} className="text-xs bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{e.source}</span>
                  <span className="text-gray-400">score: {Math.round((e.evidence_score ?? 0) * 100)}%</span>
                </div>
                {e.title && <p className="text-gray-800 font-medium">{e.title}</p>}
                {e.snippet && <p className="text-gray-500 line-clamp-2">{e.snippet}</p>}
                {e.source_url && (
                  <a href={e.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate block">{e.source_url}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-gray-100 text-sm flex items-center gap-3">
        <span className="text-gray-500">Konfirmasi alumni:</span>
        {!result.alumni_confirmation          && <span className="text-gray-400">Belum dikonfirmasi</span>}
        {result.alumni_confirmation === 'pending'   && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">Menunggu konfirmasi</span>}
        {result.alumni_confirmation === 'confirmed' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">✓ Dikonfirmasi alumni</span>}
        {result.alumni_confirmation === 'rejected'  && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">✗ Ditolak alumni</span>}
      </div>
    </div>
  );
}