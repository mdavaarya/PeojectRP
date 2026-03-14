import { supabase } from '@/lib/supabaseClient';
import { AlumniProfile, CareerMilestone, SkillCertification } from '@/types';

export async function getAlumniProfile(userId: string): Promise<AlumniProfile | null> {
  const { data, error } = await supabase
    .from('alumni_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function upsertAlumniProfile(userId: string, profile: Partial<AlumniProfile>): Promise<AlumniProfile> {
  const { data, error } = await supabase
    .from('alumni_profiles')
    .upsert({ ...profile, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCareerMilestones(alumniId: string): Promise<CareerMilestone[]> {
  const { data, error } = await supabase
    .from('career_milestones')
    .select('*')
    .eq('alumni_id', alumniId)
    .order('start_date', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function addCareerMilestone(alumniId: string, milestone: Partial<CareerMilestone>): Promise<CareerMilestone> {
  const { data, error } = await supabase
    .from('career_milestones')
    .insert({ ...milestone, alumni_id: alumniId, verification_status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMilestoneStatus(id: string, status: 'verified' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('career_milestones')
    .update({ verification_status: status })
    .eq('id', id);
  if (error) throw error;
}

export async function getCertifications(alumniId: string): Promise<SkillCertification[]> {
  const { data, error } = await supabase
    .from('skills_certifications')
    .select('*')
    .eq('alumni_id', alumniId)
    .order('year', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function addCertification(alumniId: string, cert: Partial<SkillCertification>): Promise<SkillCertification> {
  const { data, error } = await supabase
    .from('skills_certifications')
    .insert({ ...cert, alumni_id: alumniId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCertification(id: string): Promise<void> {
  const { error } = await supabase.from('skills_certifications').delete().eq('id', id);
  if (error) throw error;
}

export async function searchAlumni(query: string): Promise<AlumniProfile[]> {
  const { data, error } = await supabase
    .from('alumni_profiles')
    .select('*')
    .or(`full_name.ilike.%${query}%,nim.ilike.%${query}%,study_program.ilike.%${query}%`)
    .limit(20);
  if (error) return [];
  return data || [];
}
