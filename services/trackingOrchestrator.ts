import { createClient } from '@supabase/supabase-js';
import { AlumniProfile, SearchProfile, TrackingEvidence } from '@/types';
import { generateSearchQueries } from './queryGeneratorService';
import { aggregateCandidates } from './disambiguationEngine';
import { fetchBySource } from './externalFetcher';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function runTrackingForAlumni(
  alumni: AlumniProfile,
  jobId: string
): Promise<{ status: string; confidence: number }> {
  const supabase = getAdminClient();
  console.log(`[Tracking] Processing: ${alumni.full_name}`);

  // 1. Ambil atau buat search profile
  let profile: SearchProfile;
  const { data: profileData } = await supabase
    .from('search_profiles')
    .select('*')
    .eq('alumni_id', alumni.id)
    .single();

  if (!profileData) {
    const { data: created } = await supabase
      .from('search_profiles')
      .insert({
        alumni_id: alumni.id,
        name_variants: autoGenerateVariants(alumni.full_name),
        affiliation_keywords: ['Universitas Muhammadiyah Malang', 'UMM', alumni.study_program],
        context_keywords: [alumni.study_program.toLowerCase(), String(alumni.graduation_year), 'malang'],
        is_low_context: false,
        is_opted_out: false,
      })
      .select()
      .single();
    if (!created) return { status: 'not_found', confidence: 0 };
    profile = created as SearchProfile;
  } else {
    profile = profileData as SearchProfile;
  }

  return runTrackingWithProfile(alumni, profile, jobId, supabase);
}

async function runTrackingWithProfile(
  alumni: AlumniProfile,
  profile: SearchProfile,
  jobId: string,
  supabase: any
): Promise<{ status: string; confidence: number }> {
  if (profile.is_opted_out) {
    await supabase.from('tracking_results').insert({
      job_id: jobId, alumni_id: alumni.id,
      confidence_score: 0, tracking_status: 'opted_out', is_latest: true,
    });
    return { status: 'opted_out', confidence: 0 };
  }

  // 2. Generate & jalankan queries
  const queries = generateSearchQueries(profile);
  const allEvidence: Partial<TrackingEvidence>[] = [];

  // Kumpulkan sosmed yang ditemukan dari semua evidence
  const foundSocmed: {
    linkedin?: string; instagram?: string; facebook?: string; tiktok?: string;
    email?: string; phone?: string; employment_type?: string;
    position?: string; company?: string; work_address?: string;
  } = {};

  for (const q of queries) {
    try {
      await supabase.from('tracking_queries').insert({
        job_id: jobId, alumni_id: alumni.id,
        query_text: q.query_text, source: q.source,
        executed_at: new Date().toISOString(),
      });

      const results = await fetchBySource(
        q.source, q.query_text,
        profile.name_variants[0],
        profile.affiliation_keywords[0] ?? ''
      );

      console.log(`[Tracking] ${q.source}: ${results.length} results`);

      // Ekstrak data sosmed dari raw_data setiap evidence
      for (const ev of results) {
        const raw = ev.raw_data as any;
        if (!raw) continue;
        if (raw.detected_linkedin && !foundSocmed.linkedin)       foundSocmed.linkedin = raw.detected_linkedin;
        if (raw.detected_instagram && !foundSocmed.instagram)     foundSocmed.instagram = raw.detected_instagram;
        if (raw.detected_facebook && !foundSocmed.facebook)       foundSocmed.facebook = raw.detected_facebook;
        if (raw.detected_tiktok && !foundSocmed.tiktok)           foundSocmed.tiktok = raw.detected_tiktok;
        if (raw.detected_email && !foundSocmed.email)             foundSocmed.email = raw.detected_email;
        if (raw.detected_phone && !foundSocmed.phone)             foundSocmed.phone = raw.detected_phone;
        if (raw.detected_employment_type && !foundSocmed.employment_type) foundSocmed.employment_type = raw.detected_employment_type;
        if (raw.detected_position && !foundSocmed.position)       foundSocmed.position = raw.detected_position;
        if (raw.detected_company && !foundSocmed.company)         foundSocmed.company = raw.detected_company;
        if (raw.detected_work_address && !foundSocmed.work_address) foundSocmed.work_address = raw.detected_work_address;
      }

      allEvidence.push(...results);
      await sleep(400); // delay antar request
    } catch (err: any) {
      console.error(`[Tracking] Error ${q.source}:`, err.message);
    }
  }

  // 3. Score & disambiguate
  const { bestScore, trackingStatus, supportingSources, conflictingSources, topCandidates } =
    aggregateCandidates(allEvidence as TrackingEvidence[], alumni, profile);

  console.log(`[Tracking] ${alumni.full_name}: ${trackingStatus} (${Math.round(bestScore * 100)}%)`);

  // 4. Simpan tracking result
  const { data: savedResult } = await supabase
    .from('tracking_results')
    .insert({
      job_id: jobId,
      alumni_id: alumni.id,
      confidence_score: bestScore,
      tracking_status: trackingStatus,
      found_position:  topCandidates[0]?.evidence?.found_role ?? foundSocmed.position ?? null,
      found_company:   topCandidates[0]?.evidence?.found_affiliation ?? foundSocmed.company ?? null,
      found_location:  topCandidates[0]?.evidence?.found_location ?? foundSocmed.work_address ?? null,
      found_year:      topCandidates[0]?.evidence?.activity_year ?? null,
      supporting_sources:  supportingSources,
      conflicting_sources: conflictingSources,
      alumni_confirmation: trackingStatus === 'identified' ? 'pending' : null,
      notification_sent: false,
      is_latest: true,
    })
    .select()
    .single();

  // 5. Simpan evidence
  if (savedResult && topCandidates.length > 0) {
    for (const candidate of topCandidates.slice(0, 5)) {
      await supabase.from('tracking_evidence').insert({
        result_id:         savedResult.id,
        alumni_id:         alumni.id,
        source:            candidate.evidence.source ?? 'web',
        source_url:        candidate.evidence.source_url ?? null,
        title:             candidate.evidence.title ?? null,
        snippet:           candidate.evidence.snippet ?? null,
        found_name:        candidate.evidence.found_name ?? null,
        found_affiliation: candidate.evidence.found_affiliation ?? null,
        found_role:        candidate.evidence.found_role ?? null,
        found_location:    candidate.evidence.found_location ?? null,
        activity_year:     candidate.evidence.activity_year ?? null,
        evidence_score:    candidate.breakdown.total,
        fetched_at:        new Date().toISOString(),
      });
    }
  }

  // 6. ★ AUTO-UPDATE alumni_profiles dengan sosmed yang ditemukan ★
  //    Hanya update field yang kosong (tidak menimpa data yang sudah ada)
  const profileUpdates: Record<string, any> = {
    last_tracked_at: new Date().toISOString(),
    tracking_status: trackingStatus,
    tracking_confidence: bestScore,
    current_position: topCandidates[0]?.evidence?.found_role ?? foundSocmed.position ?? alumni.current_position,
    current_company: topCandidates[0]?.evidence?.found_affiliation ?? foundSocmed.company ?? alumni.current_company,
  };

  // Hanya isi sosmed yang belum ada di profil
  if (foundSocmed.linkedin && !alumni.linkedin_url)         profileUpdates.linkedin_url = foundSocmed.linkedin;
  if (foundSocmed.instagram && !(alumni as any).instagram_url) profileUpdates.instagram_url = foundSocmed.instagram;
  if (foundSocmed.facebook && !(alumni as any).facebook_url)   profileUpdates.facebook_url = foundSocmed.facebook;
  if (foundSocmed.tiktok && !(alumni as any).tiktok_url)       profileUpdates.tiktok_url = foundSocmed.tiktok;
  if (foundSocmed.phone && !(alumni as any).phone_number)       profileUpdates.phone_number = foundSocmed.phone;
  if (foundSocmed.employment_type && !(alumni as any).employment_sector)
    profileUpdates.employment_sector = foundSocmed.employment_type;

  await supabase.from('alumni_profiles').update(profileUpdates).eq('id', alumni.id);
  console.log(`[Tracking] Updated profile for ${alumni.full_name}:`, Object.keys(profileUpdates).join(', '));

  return { status: trackingStatus, confidence: bestScore };
}

export async function runTrackingJob(
  triggeredBy: 'scheduler' | 'manual' = 'scheduler',
  triggeredByUser?: string,
  alumniIds?: string[]
): Promise<string> {
  const supabase = getAdminClient();

  const { data: job } = await supabase
    .from('tracking_jobs')
    .insert({
      status: 'running',
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser ?? null,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (!job) throw new Error('Failed to create tracking job');
  console.log(`[TrackingJob] Job ${job.id} started`);

  try {
    let query = supabase.from('alumni_profiles').select('*');

    if (alumniIds && alumniIds.length > 0) {
      query = query.in('id', alumniIds);
    } else {
      // Prioritaskan yang belum pernah ditrack atau sudah > 30 hari
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.or(`last_tracked_at.is.null,last_tracked_at.lt.${thirtyDaysAgo.toISOString()}`);
    }

    const { data: alumniList } = await query.limit(50);
    const alumni = (alumniList ?? []) as AlumniProfile[];

    console.log(`[TrackingJob] Processing ${alumni.length} alumni`);
    await supabase.from('tracking_jobs').update({ total_alumni: alumni.length }).eq('id', job.id);

    let identified = 0, needsReview = 0, notFound = 0;

    for (let i = 0; i < alumni.length; i++) {
      const a = alumni[i];
      try {
        const { status } = await runTrackingForAlumni(a, job.id);
        if (status === 'identified')     identified++;
        else if (status === 'needs_review') needsReview++;
        else notFound++;
      } catch (err: any) {
        console.error(`[TrackingJob] Error ${a.full_name}:`, err.message);
        notFound++;
      }
      await supabase.from('tracking_jobs').update({
        processed: i + 1, identified, needs_review: needsReview, not_found: notFound,
      }).eq('id', job.id);
    }

    await supabase.from('tracking_jobs').update({
      status: 'completed', processed: alumni.length,
      identified, needs_review: needsReview, not_found: notFound,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    return job.id;
  } catch (err: any) {
    await supabase.from('tracking_jobs').update({
      status: 'failed', error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);
    throw err;
  }
}

function autoGenerateVariants(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/);
  const variants = new Set<string>();
  variants.add(fullName.trim());
  if (parts.length >= 2) {
    const first = parts[0];
    const last  = parts[parts.length - 1];
    variants.add(`${first} ${last}`);
    variants.add(`${first[0]}. ${last}`);
  }
  return Array.from(variants);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }