import { SearchProfile, TrackingSource } from '@/types';

export interface GeneratedQuery {
  query_text: string;
  source: TrackingSource;
  priority: number;
}

/**
 * Generate queries fokus pada data tugas:
 * LinkedIn, IG, FB, TikTok, Email, HP, Tempat kerja, Posisi, PNS/Swasta/Wirausaha
 * Kuota Google dibatasi ~6 query/alumni (bukan 10+)
 */
export function generateSearchQueries(profile: SearchProfile): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const { name_variants, affiliation_keywords } = profile;

  const primaryName = name_variants[0] ?? '';
  const shortName   = name_variants[1] ?? primaryName;
  const primaryAff  = affiliation_keywords[0] ?? 'Universitas Muhammadiyah Malang';
  const shortAff    = affiliation_keywords[1] ?? 'UMM';

  if (!primaryName) return [];

  // ── PRIORITAS 1: LinkedIn (paling info karir) ────────────────────────
  queries.push({
    query_text: `"${primaryName}" site:linkedin.com/in`,
    source: 'linkedin',
    priority: 1,
  });

  // ── PRIORITAS 2: LinkedIn + afiliasi (lebih presisi) ─────────────────
  if (shortAff) {
    queries.push({
      query_text: `"${shortName}" "${shortAff}" site:linkedin.com`,
      source: 'linkedin',
      priority: 2,
    });
  }

  // ── PRIORITAS 3: Instagram ────────────────────────────────────────────
  queries.push({
    query_text: `"${primaryName}" site:instagram.com`,
    source: 'instagram' as TrackingSource,
    priority: 3,
  });

  // ── PRIORITAS 4: Facebook ─────────────────────────────────────────────
  queries.push({
    query_text: `"${primaryName}" site:facebook.com`,
    source: 'facebook' as TrackingSource,
    priority: 4,
  });

  // ── PRIORITAS 5: Google umum (tempat kerja, posisi) ──────────────────
  queries.push({
    query_text: `"${primaryName}" "${primaryAff}" kerja OR bekerja OR jabatan`,
    source: 'google',
    priority: 5,
  });

  // ── PRIORITAS 6: Scholar (opsional, tetap dipertahankan) ─────────────
  // Scholar berguna untuk alumni akademisi/dosen
  queries.push({
    query_text: `"${primaryName}" "${shortAff}"`,
    source: 'scholar',
    priority: 6,
  });

  // Deduplicate
  const seen = new Set<string>();
  return queries
    .sort((a, b) => a.priority - b.priority)
    .filter(q => {
      const key = `${q.source}:${q.query_text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function autoGenerateNameVariants(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/);
  const variants = new Set<string>();
  variants.add(fullName.trim());
  if (parts.length >= 2) {
    const first = parts[0];
    const last  = parts[parts.length - 1];
    variants.add(`${first} ${last}`);
    variants.add(`${first[0]}. ${last}`);
    variants.add(`${last} ${first}`);
    if (parts.length === 3) {
      variants.add(`${first[0]}. ${parts[1]} ${last}`);
    }
  }
  return Array.from(variants);
}

export function detectLowContext(
  fullName: string,
): { isLow: boolean; reason?: string } {
  const COMMON_NAMES = [
    'budi','siti','andi','ahmad','muhammad','dian','sri','dewi',
    'rizky','reza','hasan','ali','nur','putri','agus','eko','yusuf',
    'fajar','bayu','wahyu','hendra','indra','joko','bambang',
  ];
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length === 1) return { isLow: true, reason: 'Nama hanya satu kata' };
  const commonCount = parts.filter(p => COMMON_NAMES.includes(p)).length;
  if (commonCount >= 2) return { isLow: true, reason: `Nama terlalu umum (${commonCount} kata umum)` };
  if (parts.every(p => p.replace('.', '').length <= 2)) return { isLow: true, reason: 'Inisial saja' };
  return { isLow: false };
}