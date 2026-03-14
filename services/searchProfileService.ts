import { supabase } from '@/lib/supabaseClient';
import { SearchProfile, SearchProfileInput, AlumniProfile } from '@/types';
import { autoGenerateNameVariants, detectLowContext } from './queryGeneratorService';

const UMM_AFFILIATIONS = [
  'Universitas Muhammadiyah Malang',
  'UMM',
  'Muhammadiyah Malang',
  'UM Malang',
];

/**
 * Buat search profile baru untuk alumni.
 * Auto-generate name variants dan deteksi low context.
 */
export async function createSearchProfile(
  alumni: AlumniProfile,
  input: Partial<SearchProfileInput> = {}
): Promise<SearchProfile> {
  // Auto-generate name variants jika tidak disediakan manual
  const nameVariants = input.name_variants?.length
    ? input.name_variants
    : autoGenerateNameVariants(alumni.full_name);

  // Default affiliation keywords dari data universitas
  const affiliationKeywords = input.affiliation_keywords?.length
    ? input.affiliation_keywords
    : [
        ...UMM_AFFILIATIONS,
        alumni.study_program,
        `${alumni.study_program} UMM`,
      ];

  // Default context keywords dari prodi dan tahun lulus
  const contextKeywords = input.context_keywords?.length
    ? input.context_keywords
    : [
        alumni.study_program.toLowerCase(),
        `angkatan ${alumni.graduation_year}`,
        `lulusan ${alumni.graduation_year}`,
        'malang',
      ];

  // Deteksi low context
  const { isLow, reason } = detectLowContext(
    alumni.full_name,
    alumni.graduation_year,
    alumni.study_program
  );

  const { data, error } = await supabase
    .from('search_profiles')
    .upsert(
      {
        alumni_id: alumni.id,
        name_variants: nameVariants,
        affiliation_keywords: affiliationKeywords,
        context_keywords: contextKeywords,
        is_low_context: input.is_low_context ?? isLow,
        low_context_reason: input.low_context_reason ?? reason ?? null,
      },
      { onConflict: 'alumni_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSearchProfile(alumniId: string): Promise<SearchProfile | null> {
  const { data } = await supabase
    .from('search_profiles')
    .select('*')
    .eq('alumni_id', alumniId)
    .single();
  return data ?? null;
}

export async function updateSearchProfile(
  alumniId: string,
  updates: Partial<SearchProfileInput>
): Promise<SearchProfile> {
  const { data, error } = await supabase
    .from('search_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('alumni_id', alumniId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setOptOut(
  alumniId: string,
  optOut: boolean,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('search_profiles')
    .update({
      is_opted_out:    optOut,
      opted_out_at:    optOut ? new Date().toISOString() : null,
      opted_out_reason: reason ?? null,
    })
    .eq('alumni_id', alumniId);
  if (error) throw error;
}

export async function getAllSearchProfiles(): Promise<SearchProfile[]> {
  const { data } = await supabase
    .from('search_profiles')
    .select('*, alumni_profiles(full_name, nim, study_program, graduation_year)')
    .order('updated_at', { ascending: false });
  return data ?? [];
}

/**
 * Bulk create search profiles untuk semua alumni yang belum punya profil.
 * Dipanggil oleh admin dari UI.
 */
export async function bulkCreateSearchProfiles(): Promise<{
  created: number;
  skipped: number;
}> {
  // Ambil alumni yang belum punya search profile
  const { data: allAlumni } = await supabase
    .from('alumni_profiles')
    .select('*');

  const { data: existingProfiles } = await supabase
    .from('search_profiles')
    .select('alumni_id');

  const existingIds = new Set((existingProfiles ?? []).map((p: any) => p.alumni_id));
  const toCreate = (allAlumni ?? []).filter((a: AlumniProfile) => !existingIds.has(a.id));

  let created = 0;
  for (const alumni of toCreate) {
    try {
      await createSearchProfile(alumni as AlumniProfile);
      created++;
    } catch {
      // skip failed
    }
  }

  return { created, skipped: existingIds.size };
}
