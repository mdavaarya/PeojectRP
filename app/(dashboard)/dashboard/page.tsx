import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, StatCard } from '@/components/ui/Card';
import { Briefcase, Award, Clock, CheckCircle } from 'lucide-react';

export default async function AlumniDashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Cek role — kalau admin nyasar ke sini, kirim ke /admin
  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (userData?.role === 'admin') redirect('/admin');

  // Ambil alumni profile
  const { data: profile } = await supabase
    .from('alumni_profiles').select('*').eq('user_id', user.id).single();

  // Kalau belum ada profile, arahkan ke halaman profile untuk setup
  if (!profile) redirect('/profile');

  const [{ count: total }, { count: verified }, { count: pending }, { count: certs }] =
    await Promise.all([
      supabase.from('career_milestones').select('*', { count: 'exact', head: true }).eq('alumni_id', profile.id),
      supabase.from('career_milestones').select('*', { count: 'exact', head: true }).eq('alumni_id', profile.id).eq('verification_status', 'verified'),
      supabase.from('career_milestones').select('*', { count: 'exact', head: true }).eq('alumni_id', profile.id).eq('verification_status', 'pending'),
      supabase.from('skills_certifications').select('*', { count: 'exact', head: true }).eq('alumni_id', profile.id),
    ]);

  const { data: recentMilestones } = await supabase
    .from('career_milestones').select('*')
    .eq('alumni_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <>
      <Header title="Dashboard" userName={profile.full_name} userPhoto={profile.photo_url} pendingCount={pending || 0} />
      <div className="p-6 space-y-6">
        <Card className="bg-gradient-to-r from-primary-800 to-primary-600 text-white">
          <p className="text-primary-200 text-sm">Selamat datang kembali,</p>
          <h2 className="text-2xl font-bold">{profile.full_name}</h2>
          <p className="text-primary-200 mt-1 text-sm">
            {profile.study_program} · Angkatan {profile.graduation_year}
          </p>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Milestones" value={total || 0}    icon={<Briefcase className="w-6 h-6" />} />
          <StatCard label="Verified"         value={verified || 0} icon={<CheckCircle className="w-6 h-6" />} color="text-green-600" />
          <StatCard label="Pending"          value={pending || 0}  icon={<Clock className="w-6 h-6" />}      color="text-yellow-600" />
          <StatCard label="Certifications"   value={certs || 0}    icon={<Award className="w-6 h-6" />}      color="text-purple-600" />
        </div>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Milestone Terbaru</h3>
          {!recentMilestones || recentMilestones.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Belum ada milestone.{' '}
              <a href="/milestones" className="text-primary-600 hover:underline">Tambah sekarang</a>
            </p>
          ) : (
            <div className="space-y-3">
              {recentMilestones.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{m.position_title}</p>
                    <p className="text-xs text-gray-500">{m.company_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    m.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                    m.verification_status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{m.verification_status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {!profile.linkedin_url && (
          <Card className="border-primary-200 bg-primary-50">
            <p className="text-sm text-primary-800 font-medium">
              💡 Tambahkan LinkedIn URL untuk meningkatkan visibilitas profil Anda!
            </p>
            <a href="/profile" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
              Update Profil →
            </a>
          </Card>
        )}
      </div>
    </>
  );
}