'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  User, Hash, BookOpen, Calendar, Linkedin, ArrowLeft
} from 'lucide-react';

const STUDY_PROGRAMS = [
  'Teknik Informatika', 'Sistem Informasi', 'Manajemen', 'Akuntansi',
  'Hukum', 'Kedokteran', 'Psikologi', 'Ilmu Komunikasi',
];

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName]         = useState('');
  const [nim, setNim]                   = useState('');
  const [studyProgram, setStudyProgram] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [linkedinUrl, setLinkedinUrl]   = useState('');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    if (password !== confirmPassword) { toast.error('Password tidak cocok'); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Buat user di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Gagal membuat user');

      const userId = authData.user.id;

      // 2. Insert ke tabel users — pakai upsert agar idempotent
      //    Jika RLS memblokir, kita tangkap errornya dan lanjutkan
      //    karena ada trigger di Supabase yang mungkin sudah buat row ini
      const { error: userError } = await supabase
        .from('users')
        .upsert(
          { id: userId, email, role: 'alumni' },
          { onConflict: 'id', ignoreDuplicates: true }
        );

      // Log error tapi jangan stop — mungkin sudah dibuat via trigger
      if (userError) {
        console.warn('Users table insert warning (mungkin sudah ada):', userError.message);
      }

      // 3. Insert alumni profile
      const { error: profileError } = await supabase
        .from('alumni_profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          nim,
          study_program: studyProgram,
          graduation_year: Number(graduationYear),
          linkedin_url: linkedinUrl || null,
        });
      if (profileError) throw profileError;

      toast.success('Akun berhasil dibuat! Silakan login.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <GraduationCap className="w-9 h-9 text-primary-800" />
          </div>
          <h1 className="text-3xl font-bold text-white">SILUMNI</h1>
          <p className="text-primary-200 mt-1 text-sm">Professional Milestone Aggregator</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <StepDot active={step >= 1} done={step > 1} label="1" />
            <div className={`flex-1 h-1 rounded-full transition-colors ${step > 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <StepDot active={step >= 2} done={false} label="2" />
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            {step === 1 ? 'Buat akun Anda' : 'Lengkapi profil'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {step === 1 ? 'Langkah 1 dari 2 – Kredensial akun' : 'Langkah 2 dari 2 – Data alumni'}
          </p>

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="label-base">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-base pl-10" placeholder="you@university.ac.id" required />
                </div>
              </div>

              <div>
                <label className="label-base">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-base pl-10 pr-10" placeholder="Minimal 6 karakter" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && <PasswordStrength password={password} />}
              </div>

              <div>
                <label className="label-base">Konfirmasi Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`input-base pl-10 pr-10 ${confirmPassword && confirmPassword !== password ? 'border-red-400' : ''}`}
                    placeholder="Ulangi password" required />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                )}
              </div>

              <button type="submit"
                className="w-full bg-primary-700 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-primary-800 transition-colors mt-2">
                Lanjut →
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label-base">Nama Lengkap *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="input-base pl-10" placeholder="cth. Budi Santoso" required />
                  </div>
                </div>

                <div>
                  <label className="label-base">NIM *</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={nim} onChange={e => setNim(e.target.value)}
                      className="input-base pl-10" placeholder="cth. 190511001" required />
                  </div>
                </div>

                <div>
                  <label className="label-base">Tahun Lulus *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select value={graduationYear} onChange={e => setGraduationYear(e.target.value)}
                      className="input-base pl-10" required>
                      <option value="">Pilih tahun</option>
                      {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="label-base">Program Studi *</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select value={studyProgram} onChange={e => setStudyProgram(e.target.value)}
                      className="input-base pl-10" required>
                      <option value="">Pilih program studi</option>
                      {STUDY_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="label-base">
                    LinkedIn URL <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                      className="input-base pl-10" placeholder="https://linkedin.com/in/username" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-primary-700 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-primary-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Membuat akun...
                    </span>
                  ) : 'Buat Akun'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0 ${
      done ? 'bg-green-500 text-white' : active ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-400'
    }`}>
      {done ? '✓' : label}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 6,
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Lemah', 'Cukup', 'Sedang', 'Kuat', 'Sangat Kuat'];
  const colors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const textColors = ['', 'text-red-500', 'text-yellow-600', 'text-yellow-600', 'text-blue-600', 'text-green-600'];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-xs mt-1 font-medium ${textColors[score]}`}>{labels[score]}</p>
    </div>
  );
}