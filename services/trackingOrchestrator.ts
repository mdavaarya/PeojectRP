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

  console.log(`[Tracking] Processing alumni: ${alumni.full_name} (${alumni.id})`);

  // 1. Ambil search profile
  const { data: profileData, error: profileError } = await supabase
    .from('search_profiles')
    .select('*')
    .eq('alumni_id', alumni.id)
    .single();

  if (profileError || !profileData) {
    console.log(`[Tracking] No search profile for ${alumni.full_name} — creating one now`);
    // Auto-create search profile jika belum ada
    const { data: created } = await supabase
      .from('search_profiles')
      .insert({
        alumni_id: alumni.id,
        name_variants: autoGenerateVariants(alumni.full_name),
        affiliation_keywords: [
          'Universitas Muhammadiyah Malang', 'UMM', alumni.study_program,
        ],
        context_keywords: [
          alumni.study_program.toLowerCase(),
          String(alumni.graduation_year),
          'malang',
        ],
        is_low_context: false,
        is_opted_out: false,
      })
      .select()
      .single();

    if (!created) {
      console.error(`[Tracking] Failed to create search profile for ${alumni.full_name}`);
      return { status: 'not_found', confidence: 0 };
    }
    profileData === created; // use created profile
    return runTrackingWithProfile(alumni, created as SearchProfile, jobId, supabase);
  }

  return runTrackingWithProfile(alumni, profileData as SearchProfile, jobId, supabase);
}

async function runTrackingWithProfile(
  alumni: AlumniProfile,
  profile: SearchProfile,
  jobId: string,
  supabase: any
): Promise<{ status: string; confidence: number }> {
  // Skip jika opted out
  if (profile.is_opted_out) {
    await supabase.from('tracking_results').insert({
      job_id: jobId, alumni_id: alumni.id,
      confidence_score: 0, tracking_status: 'opted_out', is_latest: true,
    });
    return { status: 'opted_out', confidence: 0 };
  }

  // 2. Generate queries
  const queries = generateSearchQueries(profile);
  console.log(`[Tracking] Generated ${queries.length} queries for ${alumni.full_name}`);

  // 3. Fetch dari sumber eksternal
  const allEvidence: Partial<TrackingEvidence>[] = [];

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

      console.log(`[Tracking] ${q.source}: "${q.query_text}" → ${results.length} results`);
      allEvidence.push(...results);
      await sleep(300);
    } catch (err: any) {
      console.error(`[Tracking] Fetch error for ${q.source}:`, err.message);
    }
  }

  console.log(`[Tracking] Total evidence collected: ${allEvidence.length}`);

  // 4. Score & disambiguate
  const { bestScore, trackingStatus, supportingSources, conflictingSources, topCandidates } =
    aggregateCandidates(allEvidence as TrackingEvidence[], alumni, profile);

  console.log(`[Tracking] Result for ${alumni.full_name}: status=${trackingStatus} score=${bestScore}`);

  // 5. Simpan result
  const { data: savedResult, error: resultError } = await supabase
    .from('tracking_results')
    .insert({
      job_id: jobId,
      alumni_id: alumni.id,
      confidence_score: bestScore,
      tracking_status: trackingStatus,
      found_position:  topCandidates[0]?.evidence?.found_role ?? null,
      found_company:   topCandidates[0]?.evidence?.found_affiliation ?? null,
      found_location:  topCandidates[0]?.evidence?.found_location ?? null,
      found_year:      topCandidates[0]?.evidence?.activity_year ?? null,
      supporting_sources:  supportingSources,
      conflicting_sources: conflictingSources,
      alumni_confirmation: trackingStatus === 'identified' ? 'pending' : null,
      notification_sent: false,
      is_latest: true,
    })
    .select()
    .single();

  if (resultError) {
    console.error(`[Tracking] Failed to save result:`, resultError.message);
    return { status: trackingStatus, confidence: bestScore };
  }

  // 6. Simpan evidence
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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.or(
        `last_tracked_at.is.null,last_tracked_at.lt.${thirtyDaysAgo.toISOString()}`
      );
    }

    const { data: alumniList, error: alumniError } = await query.limit(50);

    if (alumniError) {
      console.error('[TrackingJob] Error fetching alumni:', alumniError.message);
      throw alumniError;
    }

    const alumni = (alumniList ?? []) as AlumniProfile[];
    console.log(`[TrackingJob] Processing ${alumni.length} alumni`);

    await supabase.from('tracking_jobs').update({ total_alumni: alumni.length }).eq('id', job.id);

    let identified = 0, needsReview = 0, notFound = 0;

    for (let i = 0; i < alumni.length; i++) {
      const a = alumni[i];
      try {
        const { status } = await runTrackingForAlumni(a, job.id);
        if (status === 'identified')    identified++;
        else if (status === 'needs_review') needsReview++;
        else notFound++;
      } catch (err: any) {
        console.error(`[TrackingJob] Error for ${a.full_name}:`, err.message);
        notFound++;
      }

      // Update progress setiap alumni
      await supabase.from('tracking_jobs').update({
        processed: i + 1, identified, needs_review: needsReview, not_found: notFound,
      }).eq('id', job.id);
    }

    await supabase.from('tracking_jobs').update({
      status: 'completed', processed: alumni.length,
      identified, needs_review: needsReview, not_found: notFound,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    console.log(`[TrackingJob] Job ${job.id} completed: ${identified} identified, ${needsReview} review, ${notFound} not found`);
    return job.id;
  } catch (err: any) {
    await supabase.from('tracking_jobs').update({
      status: 'failed', error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);
    throw err;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function autoGenerateVariants(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/);
  const variants = new Set<string>();
  variants.add(fullName.trim());
  if (parts.length >= 2) {
    const first = parts[0];
    const last  = parts[parts.length - 1];
    variants.add(`${first} ${last}`);
    variants.add(`${first[0]}. ${last}`);
    variants.add(`${last} ${first}`);
  }
  return Array.from(variants);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }