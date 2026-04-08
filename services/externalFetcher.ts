import { TrackingEvidence, TrackingSource } from '@/types';

/**
 * EXTERNAL FETCHER — Refocused untuk tugas:
 * Cari: LinkedIn, Instagram, Facebook, TikTok, Email, HP, Tempat kerja, Posisi
 *
 * Strategi:
 * - LinkedIn/IG/FB/TikTok → via Google Custom Search (site: operator)
 * - Scholar → tetap dipertahankan untuk alumni akademisi
 * - ORCID → tetap untuk alumni peneliti
 * - Quota: max 6 query/alumni untuk hemat kuota Google (100/hari gratis)
 */

// ── Google Custom Search (dipakai untuk semua sosmed via site: operator) ──
export async function fetchFromGoogle(
  queryText: string,
  source: TrackingSource = 'google'
): Promise<Partial<TrackingEvidence>[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx     = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    console.warn('[Fetcher] Google Search API key not configured');
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(queryText)}&num=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[Fetcher] Google API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const items = data?.items ?? [];

    return items.map((item: any) => {
      const combined = `${item.title ?? ''} ${item.snippet ?? ''}`;
      const link = item.link ?? '';

      // Deteksi tipe sosmed dari URL
      const detectedSource = detectSourceFromUrl(link) ?? source;

      return {
        source: detectedSource,
        source_url: link,
        title:      item.title ?? '',
        snippet:    item.snippet ?? '',
        found_name: extractNameFromText(combined),
        found_affiliation: extractAffiliationFromText(combined),
        found_role: extractRoleFromText(combined),
        found_location: extractLocationFromText(combined),
        activity_year: extractYearFromText(combined),
        // Simpan URL sosmed di raw_data untuk dipakai update profil alumni
        raw_data: {
          ...item,
          detected_linkedin: isLinkedIn(link) ? link : null,
          detected_instagram: isInstagram(link) ? link : null,
          detected_facebook: isFacebook(link) ? link : null,
          detected_tiktok: isTikTok(link) ? link : null,
          detected_email: extractEmailFromText(combined),
          detected_phone: extractPhoneFromText(combined),
          detected_employment_type: detectEmploymentType(combined),
          detected_position: extractRoleFromText(combined),
          detected_company: extractAffiliationFromText(combined),
          detected_work_address: extractLocationFromText(combined),
        },
        fetched_at: new Date().toISOString(),
      };
    });
  } catch (err: any) {
    console.error('[Fetcher] Google fetch error:', err.message);
    return [];
  }
}

// ── Scholar via SerpAPI atau Google fallback ──────────────────────────────
export async function fetchFromScholar(
  name: string,
  affiliation: string
): Promise<Partial<TrackingEvidence>[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    // Fallback ke Google dengan filter scholar
    return fetchFromGoogle(`"${name}" "${affiliation}" scholar OR publikasi OR penelitian`, 'scholar');
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(`${name} ${affiliation}`)}&api_key=${apiKey}&num=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data?.organic_results ?? [];

    return results.map((r: any) => ({
      source: 'scholar' as TrackingSource,
      source_url: r.link ?? '',
      title:      r.title ?? '',
      snippet:    r.snippet ?? '',
      found_name: r.publication_info?.authors?.[0]?.name ?? '',
      found_affiliation: affiliation,
      found_role: 'Researcher / Akademisi',
      activity_year: extractYearFromText(r.publication_info?.summary ?? ''),
      raw_data: r,
      fetched_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ── ORCID (gratis, tanpa key) ─────────────────────────────────────────────
export async function fetchFromORCID(
  name: string,
  affiliationKeyword: string
): Promise<Partial<TrackingEvidence>[]> {
  try {
    const url = `https://pub.orcid.org/v3.0/search?q=${encodeURIComponent(`${name} ${affiliationKeyword}`)}&rows=3`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data?.['expanded-result'] ?? [];

    return results.map((r: any) => ({
      source: 'orcid' as TrackingSource,
      source_url: `https://orcid.org/${r['orcid-id']}`,
      title: `ORCID: ${r['given-names'] ?? ''} ${r['family-name'] ?? ''}`.trim(),
      found_name: `${r['given-names'] ?? ''} ${r['family-name'] ?? ''}`.trim(),
      found_affiliation: r['institution-name']?.[0] ?? '',
      found_role: 'Researcher',
      raw_data: r,
      fetched_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────
export async function fetchBySource(
  source: TrackingSource,
  queryText: string,
  nameVariant: string,
  affiliationKeyword: string
): Promise<Partial<TrackingEvidence>[]> {
  switch (source) {
    case 'orcid':
      return fetchFromORCID(nameVariant, affiliationKeyword);
    case 'scholar':
      return fetchFromScholar(nameVariant, affiliationKeyword);
    // LinkedIn, Instagram, Facebook, TikTok, Google, Web → semua via Google Custom Search
    case 'linkedin':
    case 'instagram' as any:
    case 'facebook' as any:
    case 'tiktok' as any:
    case 'google':
    case 'researchgate':
    case 'web':
    default:
      return fetchFromGoogle(queryText, source);
  }
}

// ── URL detectors ─────────────────────────────────────────────────────────
function detectSourceFromUrl(url: string): TrackingSource | null {
  if (isLinkedIn(url))   return 'linkedin';
  if (isInstagram(url))  return 'instagram' as TrackingSource;
  if (isFacebook(url))   return 'facebook' as TrackingSource;
  if (isTikTok(url))     return 'tiktok' as TrackingSource;
  if (url.includes('scholar.google')) return 'scholar';
  if (url.includes('orcid.org'))      return 'orcid';
  if (url.includes('researchgate'))   return 'researchgate';
  return null;
}

function isLinkedIn(url: string)   { return url.includes('linkedin.com'); }
function isInstagram(url: string)  { return url.includes('instagram.com'); }
function isFacebook(url: string)   { return url.includes('facebook.com'); }
function isTikTok(url: string)     { return url.includes('tiktok.com'); }

// ── Text extractors ───────────────────────────────────────────────────────
function extractNameFromText(text: string): string {
  const match = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})/);
  return match?.[1] ?? '';
}

function extractAffiliationFromText(text: string): string {
  const keywords = ['universitas','university','institut','pt ','cv ','tbk','corp','inc','ltd','pemerintah','dinas','kementerian','rs ','rumah sakit','bank'];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) return text.slice(idx, idx + 80).split(/[,|·\n]/)[0].trim();
  }
  return '';
}

function extractRoleFromText(text: string): string {
  const roles = [
    'software engineer','data scientist','developer','manager','director',
    'CEO','CTO','lecturer','dosen','researcher','analis','konsultan',
    'professor','dr.','kepala','koordinator','staff','pegawai','guru',
    'dokter','perawat','pengacara','akuntan','wirausaha','entrepreneur',
    'PNS','ASN','aparatur sipil',
  ];
  const lower = text.toLowerCase();
  for (const role of roles) {
    if (lower.includes(role.toLowerCase())) return role;
  }
  return '';
}

function extractLocationFromText(text: string): string {
  const cities = [
    'jakarta','surabaya','bandung','malang','yogyakarta','semarang',
    'medan','makassar','bali','denpasar','solo','bogor','depok',
    'tangerang','bekasi','palembang','balikpapan','pontianak',
  ];
  const lower = text.toLowerCase();
  for (const city of cities) {
    if (lower.includes(city)) return city.charAt(0).toUpperCase() + city.slice(1);
  }
  return '';
}

function extractYearFromText(text: string): number | undefined {
  const match = text.match(/\b(20\d{2}|19[89]\d)\b/);
  return match ? parseInt(match[1]) : undefined;
}

function extractEmailFromText(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match?.[0] ?? null;
}

function extractPhoneFromText(text: string): string | null {
  const match = text.match(/(\+62|62|0)[0-9\-\s]{8,14}/);
  return match?.[0]?.replace(/\s/g, '') ?? null;
}

function detectEmploymentType(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.match(/\bpns\b|\basin\b|aparatur sipil|pegawai negeri/)) return 'PNS';
  if (lower.match(/wiraswasta|wirausaha|entrepreneur|usaha sendiri|founder|owner|direktur cv|direktur pt/)) return 'Wirausaha';
  if (lower.match(/pt\s|tbk|swasta|perusahaan|karyawan|staff/)) return 'Swasta';
  return null;
}