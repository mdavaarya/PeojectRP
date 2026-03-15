import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, StatCard } from '@/components/ui/Card';
import { getDashboardStats, getProgramDistribution, getMilestoneStatusDistribution } from '@/services/adminService';
import ProgramDistributionChart from '@/components/charts/ProgramDistributionChart';
import MilestoneStatusChart from '@/components/charts/MilestoneStatusChart';
import { Users, CheckCircle, Clock, Award, Radar, AlertTriangle, Activity } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Debug: log env key availability
  console.log('[AdminPage] SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const [stats, programData, milestoneData] = await Promise.all([
    getDashboardStats(),
    getProgramDistribution(),
    getMilestoneStatusDistribution(),
  ]);

  console.log('[AdminPage] stats:', JSON.stringify(stats));

  // Tracking stats
  const [
    { count: tracked },
    { count: identified },
    { count: needsReview },
  ] = await Promise.all([
    supabase.from('alumni_profiles').select('*', { count: 'exact', head: true }).not('last_tracked_at', 'is', null),
    supabase.from('alumni_profiles').select('*', { count: 'exact', head: true }).eq('tracking_status', 'identified'),
    supabase.from('alumni_profiles').select('*', { count: 'exact', head: true }).eq('tracking_status', 'needs_review'),
  ]);

  const { data: lastJob } = await supabase
    .from('tracking_jobs')
    .select('status, created_at, identified, needs_review')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <>
      <Header title="Admin Dashboard" userName="Administrator" />
      <div className="p-6 space-y-6">

        {/* Alumni stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Alumni</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Alumni"        value={stats.total_alumni}         icon={<Users className="w-6 h-6" />} />
            <StatCard label="Verified Milestones" value={stats.verified_milestones}  icon={<CheckCircle className="w-6 h-6" />} color="text-green-600" />
            <StatCard label="Pending Review"      value={stats.pending_milestones}   icon={<Clock className="w-6 h-6" />}  color="text-yellow-600" />
            <StatCard label="Certifications"      value={stats.total_certifications} icon={<Award className="w-6 h-6" />}  color="text-purple-600" />
          </div>
        </div>

        {/* Tracking stats */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Status Pelacakan</h3>
            <a href="/admin/tracking" className="text-xs text-primary-600 hover:underline">Lihat detail →</a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sudah Dilacak"   value={tracked ?? 0}    icon={<Radar className="w-6 h-6" />}         color="text-blue-600" />
            <StatCard label="Teridentifikasi" value={identified ?? 0} icon={<CheckCircle className="w-6 h-6" />}   color="text-green-600" />
            <StatCard label="Perlu Review"    value={needsReview ?? 0}icon={<AlertTriangle className="w-6 h-6" />} color="text-yellow-600" />
            <Card className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-primary-50 text-primary-700">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Job Terakhir</p>
                {lastJob ? (
                  <>
                    <p className={`text-sm font-bold capitalize ${
                      lastJob.status === 'completed' ? 'text-green-600' :
                      lastJob.status === 'running'   ? 'text-blue-600 animate-pulse' :
                      lastJob.status === 'failed'    ? 'text-red-600' : 'text-gray-500'
                    }`}>{lastJob.status}</p>
                    <p className="text-xs text-gray-400">✓{lastJob.identified} ~{lastJob.needs_review}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Belum ada</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-gray-800 mb-4">Alumni by Study Program</h3>
            <ProgramDistributionChart data={programData} />
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-800 mb-4">Milestone Verification Status</h3>
            <MilestoneStatusChart data={milestoneData} />
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/admin/alumni',          label: 'Kelola Alumni',   desc: 'CRUD alumni records' },
            { href: '/admin/tracking',        label: 'Tracking Monitor',desc: 'Monitor hasil pelacakan' },
            { href: '/admin/search-profiles', label: 'Search Profiles', desc: 'Kelola profil pencarian' },
            { href: '/admin/reports',         label: 'Export Reports',  desc: 'CSV untuk akreditasi' },
          ].map(link => (
            <a key={link.href} href={link.href}>
              <Card className="hover:border-primary-300 hover:shadow-md transition cursor-pointer h-full">
                <h4 className="font-semibold text-gray-900 text-sm">{link.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}