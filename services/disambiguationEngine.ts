import { AlumniProfile, SearchProfile } from '@/types';
import { TrackingEvidence, ConfidenceBreakdown, TrackingStatus } from '@/types/tracking';
export interface ScoredCandidate {
  evidence: TrackingEvidence;
  breakdown: ConfidenceBreakdown;
  classification: 'strong' | 'needs_review' | 'no_match';
}

/**
 * DISAMBIGUASI ENGINE
 *
 * Membandingkan setiap bukti (evidence) yang ditemukan dengan profil alumni.
 * Menghasilkan confidence score 0.0–1.0 dengan breakdown per dimensi.
 *
 * Dimensi scoring:
 *  - name_match        : 0–0.30  Kecocokan nama (exact/variasi/inisial)
 *  - affiliation_match : 0–0.30  Kecocokan afiliasi (kampus/prodi)
 *  - timeline_match    : 0–0.20  Tahun aktivitas vs tahun lulus
 *  - field_match       : 0–0.10  Bidang/topik vs prodi
 *  - cross_validation  : 0–0.10  Bonus jika dikonfirmasi sumber lain
 */
export function scoreCandidate(
  evidence: TrackingEvidence,
  alumni: AlumniProfile,
  profile: SearchProfile,
  crossValidationBonus: number = 0
): ScoredCandidate {
  const breakdown: ConfidenceBreakdown = {
    name_match:        scoreNameMatch(evidence, profile),
    affiliation_match: scoreAffiliationMatch(evidence, profile),
    timeline_match:    scoreTimelineMatch(evidence, alumni),
    field_match:       scoreFieldMatch(evidence, alumni),
    cross_validation:  Math.min(crossValidationBonus, 0.10),
    total:             0,
  };

  breakdown.total = Math.min(
    1.0,
    breakdown.name_match +
    breakdown.affiliation_match +
    breakdown.timeline_match +
    breakdown.field_match +
    breakdown.cross_validation
  );

  // Klasifikasi berdasarkan threshold
  let classification: ScoredCandidate['classification'];
  if (breakdown.total >= 0.75) {
    classification = 'strong';
  } else if (breakdown.total >= 0.40) {
    classification = 'needs_review';
  } else {
    classification = 'no_match';
  }

  return { evidence, breakdown, classification };
}

// ── Scoring helpers ────────────────────────────────────────────────────────

function scoreNameMatch(evidence: TrackingEvidence, profile: SearchProfile): number {
  const foundName = normalize(evidence.found_name ?? '');
  if (!foundName) return 0;

  for (const variant of profile.name_variants) {
    const v = normalize(variant);

    // Exact match
    if (foundName === v) return 0.30;

    // Contains full variant
    if (foundName.includes(v) || v.includes(foundName)) return 0.22;

    // Inisial match — "M. Rizky" ~ "Muhammad Rizky"
    if (initialsMatch(foundName, v)) return 0.15;

    // Token overlap — minimal 2 kata yang sama
    const tokenScore = tokenOverlap(foundName, v);
    if (tokenScore >= 0.6) return 0.12;
    if (tokenScore >= 0.4) return 0.08;
  }

  return 0;
}

function scoreAffiliationMatch(evidence: TrackingEvidence, profile: SearchProfile): number {
  const foundAff = normalize(evidence.found_affiliation ?? '');
  if (!foundAff) return 0;

  for (const keyword of profile.affiliation_keywords) {
    const k = normalize(keyword);
    if (foundAff.includes(k) || k.includes(foundAff)) return 0.30;
  }

  // Partial match
  for (const keyword of profile.affiliation_keywords) {
    const tokenScore = tokenOverlap(foundAff, normalize(keyword));
    if (tokenScore >= 0.5) return 0.15;
  }

  return 0;
}

function scoreTimelineMatch(evidence: TrackingEvidence, alumni: AlumniProfile): number {
  const activityYear = evidence.activity_year;
  if (!activityYear) return 0.10; // jika tidak ada data tahun, netral

  const gradYear = alumni.graduation_year;

  // Aktivitas setelah lulus → wajar
  if (activityYear >= gradYear) {
    const gap = activityYear - gradYear;
    if (gap <= 10) return 0.20;
    if (gap <= 20) return 0.15;
    return 0.10;
  }

  // Aktivitas sebelum lulus → bisa mahasiswa, masih valid tapi lebih rendah
  const preGap = gradYear - activityYear;
  if (preGap <= 2) return 0.10;  // 1-2 tahun sebelum lulus, mungkin skripsi dll
  if (preGap <= 4) return 0.05;

  return 0; // Terlalu jauh sebelum lulus, sangat mencurigakan
}

function scoreFieldMatch(evidence: TrackingEvidence, alumni: AlumniProfile): number {
  const foundField = normalize(evidence.found_field ?? evidence.found_role ?? '');
  const program    = normalize(alumni.study_program);

  if (!foundField) return 0;

  // Pemetaan prodi ke kata kunci bidang
  const fieldMap: Record<string, string[]> = {
    'teknik informatika':    ['software','developer','programmer','it','tech','engineer','data','cloud','devops','coding'],
    'sistem informasi':      ['system','analyst','bisnis','erp','it','informasi','konsultan'],
    'manajemen':             ['manager','marketing','hr','bisnis','konsultan','finance','operasional'],
    'akuntansi':             ['akuntan','finance','audit','tax','pajak','keuangan'],
    'hukum':                 ['hukum','lawyer','pengacara','notaris','legal','advokat'],
    'kedokteran':            ['dokter','medis','klinik','rumah sakit','kesehatan','medical'],
    'psikologi':             ['psikolog','konseling','hr','sdm','mental','klinis'],
    'ilmu komunikasi':       ['media','jurnalis','komunikasi','pr','marketing','konten','broadcast'],
  };

  const keywords = fieldMap[program] ?? [];
  if (keywords.some(k => foundField.includes(k))) return 0.10;
  if (keywords.some(k => foundField.includes(k.substring(0, 4)))) return 0.05;

  return 0;
}

// ── String utilities ───────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function initialsMatch(a: string, b: string): boolean {
  // "m rizky" matches "muhammad rizky pratama" via first-char of each token
  const tokensA = a.split(' ').filter(Boolean);
  const tokensB = b.split(' ').filter(Boolean);
  if (tokensA.length < 2 || tokensB.length < 2) return false;

  // Check if A is abbreviated form of B
  const initialsOfB = tokensB.map(t => t[0]).join('');
  const initialsOfA = tokensA.map(t => t[0]).join('');

  // Last tokens must match (family name usually not abbreviated)
  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];
  if (!lastB.startsWith(lastA) && !lastA.startsWith(lastB)) return false;

  return initialsOfB.startsWith(initialsOfA) || initialsOfA.startsWith(initialsOfB);
}

function tokenOverlap(a: string, b: string): number {
  const tokA = new Set(a.split(' ').filter(t => t.length > 2));
  const tokB = new Set(b.split(' ').filter(t => t.length > 2));
  if (tokA.size === 0 || tokB.size === 0) return 0;

  let common = 0;
  tokA.forEach(t => { if (tokB.has(t)) common++; });

  return common / Math.max(tokA.size, tokB.size);
}

// ── Aggregate multiple candidates ────────────────────────────────────────

/**
 * Dari kumpulan bukti (bisa dari beberapa sumber), pilih kandidat terbaik
 * dan hitung cross-validation bonus.
 */
export function aggregateCandidates(
  evidences: TrackingEvidence[],
  alumni: AlumniProfile,
  profile: SearchProfile
): {
  bestScore: number;
  trackingStatus: TrackingStatus;
  supportingSources: string[];
  conflictingSources: string[];
  topCandidates: ScoredCandidate[];
} {
  if (evidences.length === 0) {
    return {
      bestScore: 0,
      trackingStatus: 'not_found',
      supportingSources: [],
      conflictingSources: [],
      topCandidates: [],
    };
  }

  // Score semua kandidat tanpa cross-validation dulu
  const scored = evidences
    .map(e => scoreCandidate(e, alumni, profile, 0))
    .filter(c => c.classification !== 'no_match')
    .sort((a, b) => b.breakdown.total - a.breakdown.total);

  if (scored.length === 0) {
    return {
      bestScore: 0,
      trackingStatus: 'not_found',
      supportingSources: [],
      conflictingSources: [],
      topCandidates: [],
    };
  }

  // Cross-validation: hitung sumber yang mendukung kandidat teratas
  const topCandidate = scored[0];
  const supportingSources: string[] = [];
  const conflictingSources: string[] = [];

  scored.forEach(c => {
    if (c.breakdown.total >= 0.40) {
      // Cek apakah konsisten dengan kandidat teratas
      const isConsistent = checkConsistency(c.evidence, topCandidate.evidence);
      if (isConsistent) {
        if (!supportingSources.includes(c.evidence.source)) {
          supportingSources.push(c.evidence.source);
        }
      } else {
        if (!conflictingSources.includes(c.evidence.source)) {
          conflictingSources.push(c.evidence.source);
        }
      }
    }
  });

  // Hitung cross-validation bonus
  const crossBonus = Math.min((supportingSources.length - 1) * 0.05, 0.10);

  // Re-score kandidat teratas dengan bonus
  const finalTop = scoreCandidate(topCandidate.evidence, alumni, profile, crossBonus);

  // Tentukan status
  let trackingStatus: TrackingStatus;
  if (finalTop.breakdown.total >= 0.75) {
    trackingStatus = 'identified';
  } else if (finalTop.breakdown.total >= 0.40) {
    trackingStatus = 'needs_review';
  } else {
    trackingStatus = 'not_found';
  }

  return {
    bestScore: finalTop.breakdown.total,
    trackingStatus,
    supportingSources,
    conflictingSources,
    topCandidates: scored.slice(0, 5), // top 5 untuk review
  };
}

function checkConsistency(a: TrackingEvidence, b: TrackingEvidence): boolean {
  // Nama harus mirip
  if (a.found_name && b.found_name) {
    const similarity = tokenOverlap(normalize(a.found_name), normalize(b.found_name));
    if (similarity < 0.3) return false;
  }

  // Afiliasi tidak boleh berbeda jauh
  if (a.found_affiliation && b.found_affiliation) {
    const similarity = tokenOverlap(
      normalize(a.found_affiliation),
      normalize(b.found_affiliation)
    );
    if (similarity === 0) return false;
  }

  return true;
}
