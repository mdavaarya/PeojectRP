import { SearchProfile, TrackingSource } from '@/types';

export interface GeneratedQuery {
  query_text: string;
  source: TrackingSource;
  priority: number; // 1 = highest
}

/**
 * Menghasilkan variasi query pencarian dari search profile alumni.
 * Setiap query dirancang untuk sumber yang berbeda.
 */
export function generateSearchQueries(profile: SearchProfile): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];

  const { name_variants, affiliation_keywords, context_keywords } = profile;

  // Ambil nama utama (indeks 0 = nama lengkap)
  const primaryName = name_variants[0] ?? '';
  const shortName   = name_variants[1] ?? primaryName; // nama lebih pendek
  const initialName = name_variants[2] ?? primaryName; // inisial

  const primaryAff = affiliation_keywords[0] ?? '';  // nama lengkap kampus
  const shortAff   = affiliation_keywords[1] ?? '';  // singkatan (misal "UMM")

  // ── Google / Web umum ──────────────────────────────────────────────────
  if (primaryName && primaryAff) {
    queries.push({
      query_text: `"${primaryName}" "${primaryAff}"`,
      source: 'google',
      priority: 1,
    });
  }

  if (shortName && shortAff) {
    queries.push({
      query_text: `"${shortName}" "${shortAff}"`,
      source: 'google',
      priority: 2,
    });
  }

  // Dengan konteks bidang/kota
  context_keywords.forEach((ctx, i) => {
    if (primaryName) {
      queries.push({
        query_text: `"${primaryName}" "${ctx}"`,
        source: 'google',
        priority: 3 + i,
      });
    }
  });

  // ── Google Scholar ─────────────────────────────────────────────────────
  if (primaryName) {
    queries.push({
      query_text: `"${primaryName}" site:scholar.google.com`,
      source: 'scholar',
      priority: 1,
    });

    if (primaryAff) {
      queries.push({
        query_text: `"${primaryName}" "${primaryAff}" scholar`,
        source: 'scholar',
        priority: 2,
      });
    }
  }

  // ── ORCID ──────────────────────────────────────────────────────────────
  if (primaryName) {
    queries.push({
      query_text: primaryName,    // ORCID API pakai nama saja
      source: 'orcid',
      priority: 1,
    });
  }

  // ── LinkedIn ───────────────────────────────────────────────────────────
  if (primaryName) {
    queries.push({
      query_text: `"${primaryName}" site:linkedin.com/in`,
      source: 'linkedin',
      priority: 1,
    });

    if (primaryAff) {
      queries.push({
        query_text: `"${primaryName}" "${primaryAff}" site:linkedin.com`,
        source: 'linkedin',
        priority: 2,
      });
    }
  }

  // ── ResearchGate ───────────────────────────────────────────────────────
  if (primaryName) {
    queries.push({
      query_text: `"${primaryName}" site:researchgate.net`,
      source: 'researchgate',
      priority: 2,
    });
  }

  // ── GitHub ─────────────────────────────────────────────────────────────
  // Hanya relevan jika alumni dari prodi teknis
  const isTech = context_keywords.some(k =>
    ['informatika', 'teknik', 'komputer', 'software', 'it', 'programming'].includes(k.toLowerCase())
  );
  if (isTech && primaryName) {
    queries.push({
      query_text: `"${initialName}" "${shortAff || primaryAff}"`,
      source: 'github',
      priority: 3,
    });
  }

  // Sort by priority, deduplicate
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

/**
 * Auto-generate name variants dari nama lengkap alumni.
 * Dipakai saat admin membuat search profile baru.
 */
export function autoGenerateNameVariants(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/);
  const variants = new Set<string>();

  variants.add(fullName.trim());

  if (parts.length >= 2) {
    const first = parts[0];
    const last  = parts[parts.length - 1];

    // "Nama Depan Nama Belakang"
    variants.add(`${first} ${last}`);

    // Singkat nama depan: "M. Rizky"
    variants.add(`${first[0]}. ${last}`);

    // Urutan terbalik
    variants.add(`${last} ${first}`);

    // Tiga kata: "Ahmad Rizky Pratama" → "A. Rizky Pratama"
    if (parts.length === 3) {
      variants.add(`${first[0]}. ${parts[1]} ${last}`);
      variants.add(`${first} ${parts[1][0]}. ${last}`);
    }
  }

  return Array.from(variants);
}

/**
 * Deteksi apakah nama alumni tergolong "low context"
 * (terlalu umum sehingga pencarian akan noisy).
 */
export function detectLowContext(
  fullName: string,
  graduationYear: number,
  studyProgram: string
): { isLow: boolean; reason?: string } {
  const COMMON_NAMES = [
    'budi','siti','andi','ahmad','muhammad','dian','sri','dewi',
    'rizky','reza','hasan','ali','nur','putri','agus','eko','yusuf',
    'fajar','bayu','wahyu','hendra','indra','joko','bambang',
  ];

  const parts = fullName.trim().toLowerCase().split(/\s+/);

  // Nama hanya satu kata
  if (parts.length === 1) {
    return { isLow: true, reason: 'Nama hanya terdiri dari satu kata' };
  }

  // Nama depan sangat umum DAN nama belakang juga umum
  const commonCount = parts.filter(p => COMMON_NAMES.includes(p)).length;
  if (commonCount >= 2) {
    return {
      isLow: true,
      reason: `Nama mengandung ${commonCount} kata yang sangat umum, hasil pencarian akan noisy`,
    };
  }

  // Inisial saja (misal "A. B.")
  if (parts.every(p => p.replace('.', '').length <= 2)) {
    return { isLow: true, reason: 'Nama terdiri dari inisial saja' };
  }

  return { isLow: false };
}
