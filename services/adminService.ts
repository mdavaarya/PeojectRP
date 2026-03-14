import { supabase } from '@/lib/supabaseClient';
import { AlumniProfile, DashboardStats, ProgramDistribution, MilestoneStatusDistribution } from '@/types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    { count: total_alumni },
    { count: verified_milestones },
    { count: pending_milestones },
    { count: total_certifications },
  ] = await Promise.all([
    supabase.from('alumni_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('career_milestones').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    supabase.from('career_milestones').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('skills_certifications').select('*', { count: 'exact', head: true }),
  ]);
  return {
    total_alumni: total_alumni || 0,
    verified_milestones: verified_milestones || 0,
    pending_milestones: pending_milestones || 0,
    total_certifications: total_certifications || 0,
  };
}

export async function getProgramDistribution(): Promise<ProgramDistribution[]> {
  const { data } = await supabase.from('alumni_profiles').select('study_program');
  if (!data) return [];
  const map: Record<string, number> = {};
  data.forEach(({ study_program }) => { map[study_program] = (map[study_program] || 0) + 1; });
  return Object.entries(map).map(([study_program, count]) => ({ study_program, count }));
}

export async function getMilestoneStatusDistribution(): Promise<MilestoneStatusDistribution[]> {
  const { data } = await supabase.from('career_milestones').select('verification_status');
  if (!data) return [];
  const map: Record<string, number> = {};
  data.forEach(({ verification_status }) => { map[verification_status] = (map[verification_status] || 0) + 1; });
  return Object.entries(map).map(([status, count]) => ({ status: status as any, count }));
}

export async function getAllAlumni(): Promise<AlumniProfile[]> {
  const { data } = await supabase.from('alumni_profiles').select('*, users(email)').order('full_name');
  return (data as any[]) || [];
}

export async function deleteAlumni(alumniId: string, userId: string): Promise<void> {
  await supabase.from('career_milestones').delete().eq('alumni_id', alumniId);
  await supabase.from('skills_certifications').delete().eq('alumni_id', alumniId);
  await supabase.from('alumni_profiles').delete().eq('id', alumniId);
  await supabase.from('users').delete().eq('id', userId);
}

export async function getReportData(): Promise<any[]> {
  const { data } = await supabase
    .from('alumni_profiles')
    .select(`
      full_name, nim, graduation_year, study_program, linkedin_url,
      career_milestones(company_name, position_title, start_date, classification_label, verification_status),
      skills_certifications(certificate_name, issuer, year)
    `);
  return data || [];
}
