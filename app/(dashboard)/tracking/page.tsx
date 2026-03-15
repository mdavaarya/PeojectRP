'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TrackingResult } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, AlertTriangle, Clock,
  MapPin, Briefcase, Building2, Calendar,
  Shield, ExternalLink, Bell
} from 'lucide-react';

export default function AlumniTrackingPage() {
  const [results, setResults] = useState<TrackingResult[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('alumni_profiles').select('full_name').eq('user_id', user.id).single();
      if (profile) setUserName(profile.full_name);

      // Cek opt-out status
      const { data: sp } = await supabase
        .from('search_profiles')
        .select('is_opted_out')
        .eq('alumni_id', (await supabase.from('alumni_profiles').select('id').eq('user_id', user.id).single()).data?.id)
        .single();
      setOptedOut(sp?.is_opted_out ?? false);

      // Ambil hasil tracking
      const res = await fetch('/api/tracking/results');
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, []);

  const handleConfirmation = async (resultId: string, action: 'confirmed' | 'rejected') => {
    setConfirming(resultId);
    try {
      const res = await fetch('/api/tracking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId, action }),
      });
      if (!res.ok) throw new Error('Gagal memproses konfirmasi');

      setResults(prev =>
        prev.map(r => r.id === resultId ? { ...r, alumni_confirmation: action } : r)
      );

      if (action === 'confirmed') {
        toast.success('Informasi dikonfirmasi! Career milestone otomatis ditambahkan.');
      } else {
        toast.success('Informasi ditolak. Terima kasih atas koreksinya.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfirming(null);
    }
  };

  const pendingResults = results.filter(r =>
    r.tracking_status === 'identified' && r.alumni_confirmation === 'pending'
  );
  const confirmedResults = results.filter(r => r.alumni_confirmation === 'confirmed');
  const otherResults = results.filter(r =>
    r.tracking_status !== 'identified' || (r.alumni_confirmation && r.alumni_confirmation !== 'pending')
  );

  return (
    <>
      <Header title="Tracking Karir" userName={userName} />
      <div className="p-6 max-w-3xl mx-auto space-y-6">

        {/* Opt-out banner */}
        {optedOut && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Anda terdaftar sebagai Opt-out</p>
                <p className="text-red-600 text-xs mt-0.5">
                  Data Anda tidak akan dilacak dari sumber publik. Hubungi admin jika ingin mengaktifkan kembali.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Penjelasan */}
        <Card className="bg-primary-50 border-primary-200">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-primary-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary-900 text-sm">Tentang Pelacakan Karir</p>
              <p className="text-primary-700 text-xs mt-1 leading-relaxed">
                Sistem kami secara berkala mencari informasi karir Anda dari sumber publik seperti LinkedIn,
                Google Scholar, ORCID, dan GitHub. Setiap temuan perlu dikonfirmasi oleh Anda sebelum
                disimpan ke profil. Anda juga bisa menolak jika informasi tersebut tidak akurat.
              </p>
            </div>
          </div>
        </Card>

        {/* Pending confirmations — urgent */}
        {pendingResults.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Menunggu Konfirmasi Anda ({pendingResults.length})
            </h3>
            <div className="space-y-4">
              {pendingResults.map(result => (
                <TrackingResultCard
                  key={result.id}
                  result={result}
                  onConfirm={() => handleConfirmation(result.id, 'confirmed')}
                  onReject={()  => handleConfirmation(result.id, 'rejected')}
                  isConfirming={confirming === result.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Confirmed */}
        {confirmedResults.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sudah Dikonfirmasi ({confirmedResults.length})
            </h3>
            <div className="space-y-3">
              {confirmedResults.map(r => (
                <TrackingResultCard key={r.id} result={r} readonly />
              ))}
            </div>
          </div>
        )}

        {/* Loading / empty */}
        {loading && (
          <Card><p className="text-center text-gray-400 py-8">Memuat data...</p></Card>
        )}

        {!loading && results.length === 0 && (
          <Card>
            <div className="text-center py-10">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-500">Belum ada hasil tracking</p>
              <p className="text-sm text-gray-400 mt-1">
                Sistem akan mencari informasi karir Anda secara berkala setiap minggu.
              </p>
            </div>
          </Card>
        )}

        {/* Other results (needs_review, not_found) */}
        {otherResults.filter(r => r.tracking_status === 'needs_review').length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm text-gray-500">
              Perlu Verifikasi Manual
            </h3>
            <div className="space-y-3">
              {otherResults
                .filter(r => r.tracking_status === 'needs_review')
                .map(r => <TrackingResultCard key={r.id} result={r} readonly />)
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Result Card ────────────────────────────────────────────────────────────

function TrackingResultCard({
  result,
  onConfirm,
  onReject,
  isConfirming,
  readonly,
}: {
  result: TrackingResult;
  onConfirm?: () => void;
  onReject?: () => void;
  isConfirming?: boolean;
  readonly?: boolean;
}) {
  const confidence = Math.round(result.confidence_score * 100);
  const evidences  = (result as any).tracking_evidence ?? [];

  const statusConfig = {
    identified:   { color: 'border-green-200 bg-white',  badge: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-4 h-4 text-green-500" />,  label: 'Teridentifikasi' },
    needs_review: { color: 'border-yellow-200 bg-white', badge: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, label: 'Perlu Review' },
    not_found:    { color: 'border-gray-200 bg-gray-50',  badge: 'bg-gray-100 text-gray-500',    icon: <XCircle className="w-4 h-4 text-gray-400" />,       label: 'Tidak Ditemukan' },
    opted_out:    { color: 'border-gray-200 bg-gray-50',  badge: 'bg-gray-100 text-gray-500',    icon: <Shield className="w-4 h-4 text-gray-400" />,        label: 'Opt-out' },
    untracked:    { color: 'border-gray-200 bg-gray-50',  badge: 'bg-gray-100 text-gray-500',    icon: <Clock className="w-4 h-4 text-gray-400" />,         label: 'Belum Dilacak' },
  };

  const cfg = statusConfig[result.tracking_status] ?? statusConfig.untracked;

  return (
    <div className={`border rounded-xl p-5 ${cfg.color}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className={`text-xs font-medium ${confidence >= 75 ? 'text-green-600' : confidence >= 40 ? 'text-yellow-600' : 'text-gray-400'}`}>
            {confidence}% confidence
          </span>
        </div>
        {result.alumni_confirmation === 'confirmed' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Dikonfirmasi</span>
        )}
        {result.alumni_confirmation === 'rejected' && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✗ Ditolak</span>
        )}
      </div>

      {/* Found info */}
      {result.found_position || result.found_company ? (
        <div className="space-y-2 mb-4">
          {result.found_position && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium">{result.found_position}</span>
            </div>
          )}
          {result.found_company && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {result.found_company}
            </div>
          )}
          {result.found_location && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {result.found_location}
            </div>
          )}
          {result.found_year && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              Terdeteksi aktif tahun {result.found_year}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-4">Tidak ada informasi karir yang ditemukan.</p>
      )}

      {/* Sources */}
      {result.supporting_sources?.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500">Ditemukan di:</span>
          {result.supporting_sources.map(s => (
            <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      {/* Evidence snippets */}
      {evidences.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mb-4">
          <p className="text-xs text-gray-500 font-medium mb-2">Bukti temuan:</p>
          <div className="space-y-2">
            {evidences.slice(0, 2).map((e: any) => (
              <div key={e.id} className="text-xs bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-600 font-medium">{e.source}</span>
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-500">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {e.title   && <p className="text-gray-700 font-medium">{e.title}</p>}
                {e.snippet && <p className="text-gray-500 line-clamp-2 mt-0.5">{e.snippet}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — only for pending */}
      {!readonly && result.alumni_confirmation === 'pending' && (
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button
            size="sm"
            variant="success"
            onClick={onConfirm}
            loading={isConfirming}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Ya, Ini Benar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={onReject}
            loading={isConfirming}
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Bukan Saya / Salah
          </Button>
        </div>
      )}
    </div>
  );
}
