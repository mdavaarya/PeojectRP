'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import { Card, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { TrackingJob, TrackingResult } from '@/types';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Play, RefreshCw, Clock, CheckCircle, AlertTriangle,
  XCircle, Eye, Users, BarChart3, Zap, Activity,
  Info, ExternalLink, TrendingUp, Search, AlertCircle
} from 'lucide-react';

type ExtendedResult = TrackingResult & {
  alumni_profiles?: {
    full_name: string;
    study_program: string;
    graduation_year: number;
    nim: string;
  };
  tracking_evidence?: Array<{
    id: string;
    source: string;
    source_url?: string;
    title?: string;
    snippet?: string;
    found_name?: string;
    found_affiliation?: string;
    found_role?: string;
    found_location?: string;
    activity_year?: number;
    evidence_score?: number;
  }>;
};

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 75 ? 'bg-green-500' :
    pct >= 55 ? 'bg-yellow-400' :
    pct >= 40 ? 'bg-orange-400' : 'bg-gray-300';
  const label =
    pct >= 75 ? 'Tinggi' :
    pct >= 55 ? 'Sedang' :
    pct >= 40 ? 'Rendah' : 'Sangat Rendah';
  const textColor =
    pct >= 75 ? 'text-green-700' :
    pct >= 55 ? 'text-yellow-700' :
    pct >= 40 ? 'text-orange-700' : 'text-gray-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
      <span className="text-xs text-gray-400">({label})</span>
    </div>
  );
}

function ApiHealthBanner({ results }: { results: ExtendedResult[] }) {
  const allSources = results.flatMap(r => r.supporting_sources ?? []);
  const hasGoogle  = allSources.some(s => s === 'google' || s === 'linkedin');
  if (!results.length || hasGoogle) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800">⚠️ Google Search API belum terkonfigurasi</p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          Semua hasil saat ini hanya dari Scholar/ORCID. LinkedIn, ResearchGate, Facebook, dan Instagram
          membutuhkan <code className="bg-amber-100 px-1 rounded">GOOGLE_SEARCH_API_KEY</code> dan{' '}
          <code className="bg-amber-100 px-1 rounded">GOOGLE_SEARCH_CX</code> di file <code className="bg-amber-100 px-1 rounded">.env</code>.
          Confidence score akan jauh lebih akurat setelah API dikonfigurasi.
        </p>
        <div className="mt-2 flex gap-3">
          <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
            className="text-xs text-amber-700 underline hover:text-amber-900 flex items-center gap-1">
            Buat API Key <ExternalLink className="w-3 h-3" />
          </a>
          <a href="https://programmablesearchengine.google.com" target="_blank" rel="noopener noreferrer"
            className="text-xs text-amber-700 underline hover:text-amber-900 flex items-center gap-1">
            Buat Search Engine ID (CX) <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

const STATUS_EXPLANATION: Record<string, { label: string; desc: string; color: string }> = {
  identified:   { label: 'Teridentifikasi', desc: 'Confidence >= 75%. Alumni kemungkinan besar ditemukan.', color: 'text-green-700 bg-green-50' },
  needs_review: { label: 'Perlu Review',    desc: 'Confidence 40-74%. Ditemukan tapi perlu verifikasi manual.', color: 'text-yellow-700 bg-yellow-50' },
  not_found:    { label: 'Tidak Ditemukan', desc: 'Confidence < 40% atau tidak ada bukti sama sekali.', color: 'text-gray-600 bg-gray-50' },
  opted_out:    { label: 'Opt-out',         desc: 'Alumni meminta tidak dilacak.', color: 'text-red-700 bg-red-50' },
};

export default function AdminTrackingPage() {
  const [jobs,       setJobs]       = useState<TrackingJob[]>([]);
  const [results,    setResults]    = useState<ExtendedResult[]>([]);
  const [selected,   setSelected]   = useState<ExtendedResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [running,    setRunning]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<string>('all');
  const handleFilterChange = (f: string) => { setFilter(f); setPage(1); };
  const { currentPage, totalPages, paginated: paginatedResults, setPage } = usePagination(
    filter === 'all' ? results : results.filter(r => r.tracking_status === filter),
    PAGE_SIZE
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [jobsRes, resultsRes] = await Promise.all([
        fetch('/api/tracking/jobs').then(r => r.json()),
        fetch('/api/tracking/results').then(r => r.json()),
      ]);
      const jobList    = Array.isArray(jobsRes)    ? jobsRes    : [];
      const resultList = Array.isArray(resultsRes) ? resultsRes : [];
      setJobs(jobList);
      setResults(resultList);
      setLoading(false);
      const hasRunning = jobList.some((j: TrackingJob) => j.status === 'running');
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(loadData, 5000);
  }, [loadData]);

  const handleRunJob = async () => {
    setRunning(true);
    try {
      const res  = await fetch('/api/tracking/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Job dimulai! ID: ${data.job_id?.slice(0, 8)}...`);
      await loadData();
      startPolling();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menjalankan job');
    } finally {
      setRunning(false);
    }
  };

  const stats = {
    total:       results.length,
    identified:  results.filter(r => r.tracking_status === 'identified').length,
    needsReview: results.filter(r => r.tracking_status === 'needs_review').length,
    notFound:    results.filter(r => r.tracking_status === 'not_found').length,
    optedOut:    results.filter(r => r.tracking_status === 'opted_out').length,
  };

  const filteredResults = filter === 'all' ? results : results.filter(r => r.tracking_status === filter);

  const statusIcon = (status: string) => {
    if (status === 'identified')   return <CheckCircle  className="w-4 h-4 text-green-500" />;
    if (status === 'needs_review') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (status === 'not_found')    return <XCircle      className="w-4 h-4 text-gray-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const jobBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      running:   'bg-blue-100 text-blue-700',
      failed:    'bg-red-100 text-red-700',
      pending:   'bg-gray-100 text-gray-600',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? map.pending}`}>{status}</span>;
  };

  const resultColumns = [
    {
      key: 'alumni', label: 'Alumni',
      render: (r: ExtendedResult) => {
        const p = r.alumni_profiles;
        return (
          <div>
            <p className="font-medium text-gray-900 text-sm">{p?.full_name ?? <span className="text-gray-400 italic text-xs">Nama tidak tersedia</span>}</p>
            {p && <p className="text-xs text-gray-400">{p.study_program} · Lulus {p.graduation_year}</p>}
          </div>
        );
      },
    },
    {
      key: 'tracking_status', label: 'Status',
      render: (r: ExtendedResult) => {
        const cfg = STATUS_EXPLANATION[r.tracking_status];
        return (
          <div className="flex items-center gap-1.5" title={cfg?.desc}>
            {statusIcon(r.tracking_status)}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color ?? ''}`}>{cfg?.label ?? r.tracking_status}</span>
          </div>
        );
      },
    },
    {
      key: 'confidence_score', label: 'Confidence',
      render: (r: ExtendedResult) => <ConfidenceBadge score={r.confidence_score} />,
    },
    {
      key: 'found', label: 'Ditemukan',
      render: (r: ExtendedResult) => (
        <div className="text-sm">
          {r.found_position ? (
            <>
              <p className="text-gray-800 font-medium">{r.found_position}</p>
              {r.found_company  && <p className="text-gray-500 text-xs">{r.found_company}</p>}
              {r.found_location && <p className="text-gray-400 text-xs">📍 {r.found_location}</p>}
            </>
          ) : <span className="text-gray-300 text-xs italic">Belum terdeteksi</span>}
        </div>
      ),
    },
    {
      key: 'evidence', label: 'Bukti',
      render: (r: ExtendedResult) => {
        const ev = r.tracking_evidence ?? [];
        const sources = [...new Set(ev.map(e => e.source))];
        return ev.length === 0
          ? <span className="text-gray-300 text-xs italic">Tidak ada</span>
          : (
            <div className="flex flex-wrap gap-1">
              {sources.map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs" title={`${ev.filter(e => e.source === s).length} bukti dari ${s}`}>
                  {s} ({ev.filter(e => e.source === s).length})
                </span>
              ))}
            </div>
          );
      },
    },
    {
      key: 'confirmation', label: 'Konfirmasi',
      render: (r: ExtendedResult) => {
        if (!r.alumni_confirmation) return <span className="text-gray-300 text-xs">—</span>;
        const map: Record<string,string> = { confirmed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700' };
        const lbl: Record<string,string> = { confirmed: '✓ Dikonfirmasi', rejected: '✗ Ditolak', pending: '⏳ Menunggu' };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[r.alumni_confirmation] ?? ''}`}>{lbl[r.alumni_confirmation] ?? r.alumni_confirmation}</span>;
      },
    },
    {
      key: 'actions', label: '',
      render: (r: ExtendedResult) => (
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pelacakan Alumni Otomatis</h2>
            <p className="text-sm text-gray-500 mt-0.5">Jadwal otomatis: setiap Senin 02:00 UTC via Vercel Cron</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadData}><RefreshCw className="w-4 h-4 mr-1.5" /> Refresh</Button>
            <Button onClick={handleRunJob} loading={running}><Play className="w-4 h-4 mr-1.5" /> Jalankan Sekarang</Button>
          </div>
        </div>

        <ApiHealthBanner results={results} />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Dilacak"   value={stats.total}       icon={<Users         className="w-5 h-5" />} />
          <StatCard label="Teridentifikasi" value={stats.identified}  icon={<CheckCircle   className="w-5 h-5" />} color="text-green-600" />
          <StatCard label="Perlu Review"    value={stats.needsReview} icon={<AlertTriangle className="w-5 h-5" />} color="text-yellow-600" />
          <StatCard label="Tidak Ditemukan" value={stats.notFound}    icon={<XCircle       className="w-5 h-5" />} color="text-gray-500" />
          <StatCard label="Opt-out"         value={stats.optedOut}    icon={<Activity      className="w-5 h-5" />} color="text-red-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-600" /> Riwayat Job
            </h3>
            {loading ? <p className="text-gray-400 text-sm text-center py-4">Memuat...</p>
              : jobs.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Belum ada job</p>
              : (
                <div className="space-y-3">
                  {jobs.slice(0, 8).map(job => (
                    <div key={job.id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">{jobBadge(job.status)}<span className="text-xs text-gray-400 capitalize">{job.triggered_by}</span></div>
                        <p className="text-xs text-gray-600 mt-1 font-medium">{job.processed}/{job.total_alumni} alumni</p>
                        <p className="text-xs text-gray-400">{formatDate(job.created_at)}</p>
                        {job.status === 'running' && <p className="text-xs text-blue-500 mt-1">⚡ Sedang berjalan...</p>}
                      </div>
                      <div className="text-right text-xs flex-shrink-0 space-y-0.5">
                        <p className="text-green-600 font-medium">{job.identified} ✓ identified</p>
                        <p className="text-yellow-600">{job.needs_review} ~ review</p>
                        <p className="text-gray-400">{job.not_found} ✗ not found</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600" /> Distribusi Status Pelacakan
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Status ditentukan dari <strong>confidence score</strong>: hijau ≥ 75% · kuning 40–74% · abu &lt; 40%
            </p>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Belum ada data tracking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: 'identified',   label: 'Teridentifikasi', color: 'bg-green-500',  count: stats.identified,  desc: 'Confidence >= 75%' },
                  { key: 'needs_review', label: 'Perlu Review',    color: 'bg-yellow-400', count: stats.needsReview, desc: 'Confidence 40-74%' },
                  { key: 'not_found',    label: 'Tidak Ditemukan', color: 'bg-gray-300',   count: stats.notFound,    desc: 'Confidence < 40%' },
                  { key: 'opted_out',    label: 'Opt-out',         color: 'bg-red-300',    count: stats.optedOut,    desc: 'Tidak mau dilacak' },
                ].map(({ key, label, color, count, desc }) => {
                  const pct = results.length ? Math.round((count / results.length) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 font-medium">{label}</span>
                          <span className="text-xs text-gray-400">— {desc}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {stats.needsReview > 0 && stats.identified === 0 && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Semua hasil masih "Perlu Review"</strong> — ini normal jika Google Search API belum dikonfigurasi.
                      Score dari Scholar saja tidak cukup untuk mencapai threshold identifikasi (>=75%).
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">Hasil Pelacakan Terbaru</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredResults.length} dari {results.length} alumni</span>
            </div>
            <div className="flex gap-1 text-xs">
              {[
                { key: 'all',          label: 'Semua' },
                { key: 'identified',   label: '✓ Teridentifikasi' },
                { key: 'needs_review', label: '~ Perlu Review' },
                { key: 'not_found',    label: '✗ Tidak Ditemukan' },
              ].map(f => (
                <button key={f.key} onClick={() => handleFilterChange(f.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Table columns={resultColumns} data={paginatedResults} keyField="id" loading={loading}
            emptyMessage="Belum ada hasil tracking. Generate Search Profiles dulu, lalu jalankan tracking job." />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => { setPage(p); }} totalItems={filteredResults.length} itemsPerPage={PAGE_SIZE} />
        </Card>
      </div>

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Detail Hasil Tracking" size="lg">
        {selected && <TrackingResultDetail result={selected} />}
      </Modal>
    </>
  );
}

function TrackingResultDetail({ result }: { result: ExtendedResult }) {
  const confidence = Math.round(result.confidence_score * 100);
  const evidences  = result.tracking_evidence ?? [];
  const profile    = result.alumni_profiles;
  const confColor  = confidence >= 75 ? 'text-green-600' : confidence >= 40 ? 'text-yellow-600' : 'text-gray-500';
  const sourceSummary = evidences.reduce((acc, e) => { acc[e.source] = (acc[e.source] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500 text-xs uppercase tracking-wide">Alumni</span><p className="font-semibold text-gray-900 mt-0.5">{profile?.full_name ?? '-'}</p></div>
        <div><span className="text-gray-500 text-xs uppercase tracking-wide">Program Studi</span><p className="font-medium text-gray-800 mt-0.5">{profile?.study_program ?? '-'}</p></div>
        <div>
          <span className="text-gray-500 text-xs uppercase tracking-wide">Status</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {result.tracking_status === 'identified'   && <CheckCircle  className="w-4 h-4 text-green-500" />}
            {result.tracking_status === 'needs_review' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            {result.tracking_status === 'not_found'    && <XCircle      className="w-4 h-4 text-gray-400" />}
            <span className="font-medium capitalize">{STATUS_EXPLANATION[result.tracking_status]?.label ?? result.tracking_status}</span>
          </div>
        </div>
        <div><span className="text-gray-500 text-xs uppercase tracking-wide">Confidence Score</span><p className={`font-bold text-xl mt-0.5 ${confColor}`}>{confidence}%</p></div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800">
        <p className="font-semibold mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Cara membaca confidence score</p>
        <ul className="space-y-1 text-blue-700 leading-relaxed">
          <li>🟢 <strong>>=75%</strong> → Teridentifikasi (nama + afiliasi + bidang cocok)</li>
          <li>🟡 <strong>40–74%</strong> → Perlu Review (hanya sebagian cocok, perlu konfirmasi manual)</li>
          <li>⚫ <strong>&lt;40%</strong> → Tidak ditemukan (bukti tidak cukup)</li>
        </ul>
        <p className="mt-2 text-blue-600">Score rendah seringkali karena Google API belum dikonfigurasi — hanya Scholar yang aktif.</p>
      </div>

      {(result.found_position || result.found_company) ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-semibold text-green-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Informasi Karir Ditemukan</p>
          <div className="grid grid-cols-2 gap-2">
            {result.found_position && <div><span className="text-gray-500">Posisi:</span> <span className="font-medium">{result.found_position}</span></div>}
            {result.found_company  && <div><span className="text-gray-500">Instansi:</span> <span className="font-medium">{result.found_company}</span></div>}
            {result.found_location && <div><span className="text-gray-500">Lokasi:</span> {result.found_location}</div>}
            {result.found_year     && <div><span className="text-gray-500">Tahun:</span> {result.found_year}</div>}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-500 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" /> Tidak ada informasi karir spesifik yang berhasil diekstrak.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Sumber Pendukung</p>
          <div className="flex flex-wrap gap-1">
            {result.supporting_sources?.length
              ? result.supporting_sources.map(s => <span key={s} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>)
              : <span className="text-xs text-gray-400">Tidak ada</span>}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Sumber Konflik</p>
          <div className="flex flex-wrap gap-1">
            {result.conflicting_sources?.length
              ? result.conflicting_sources.map(s => <span key={s} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{s}</span>)
              : <span className="text-xs text-gray-400">Tidak ada</span>}
          </div>
        </div>
      </div>

      {Object.keys(sourceSummary).length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Ringkasan Bukti ({evidences.length} total)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(sourceSummary).map(([src, count]) => (
              <span key={src} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">{src}: <strong>{count}</strong> bukti</span>
            ))}
          </div>
        </div>
      )}

      {evidences.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Detail Bukti ({evidences.length})</p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {evidences.map((e) => (
              <div key={e.id} className="text-xs bg-gray-50 rounded-xl p-3 space-y-1.5 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{e.source}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${(e.evidence_score ?? 0) >= 0.75 ? 'text-green-600' : (e.evidence_score ?? 0) >= 0.40 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      skor: {Math.round((e.evidence_score ?? 0) * 100)}%
                    </span>
                    {e.source_url && (
                      <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                {e.found_name        && <p className="text-gray-600"><span className="text-gray-400">Nama ditemukan:</span> <strong>{e.found_name}</strong></p>}
                {e.found_affiliation && <p className="text-gray-600"><span className="text-gray-400">Afiliasi:</span> {e.found_affiliation}</p>}
                {e.title   && <p className="text-gray-800 font-medium leading-snug">{e.title}</p>}
                {e.snippet && <p className="text-gray-500 line-clamp-2">{e.snippet}</p>}
                {e.source_url && <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block">{e.source_url}</a>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4 text-center">Tidak ada detail bukti tersimpan.</div>
      )}

      <div className="pt-3 border-t border-gray-100 text-sm flex items-center gap-3">
        <span className="text-gray-500 font-medium">Konfirmasi alumni:</span>
        {!result.alumni_confirmation && <span className="text-gray-400">Belum dikonfirmasi</span>}
        {result.alumni_confirmation === 'pending'   && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">⏳ Menunggu konfirmasi</span>}
        {result.alumni_confirmation === 'confirmed' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">✓ Dikonfirmasi alumni</span>}
        {result.alumni_confirmation === 'rejected'  && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">✗ Ditolak alumni</span>}
      </div>
    </div>
  );
}