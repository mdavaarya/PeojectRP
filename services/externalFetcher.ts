import { TrackingEvidence, TrackingSource } from '@/types';

/**
 * EXTERNAL API FETCHER
 *
 * Mengambil data dari sumber publik.
 * Setiap fetcher mengembalikan array TrackingEvidence (parsial)
 * yang kemudian di-score oleh disambiguationEngine.
 */

// ── ORCID Public API (gratis, tidak butuh key) ─────────────────────────────
export async function fetchFromORCID(
  name: string,
  affiliationKeyword: string
): Promise<Partial<TrackingEvidence>[]> {
  try {
    const query = encodeURIComponent(`${name} ${affiliationKeyword}`);
    const url = `https://pub.orcid.org/v3.0/search?q=${query}&rows=5`;

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
      title: `ORCID Profile: ${r['given-names'] ?? ''} ${r['family-name'] ?? ''}`.trim(),
      found_name: `${r['given-names'] ?? ''} ${r['family-name'] ?? ''}`.trim(),
      found_affiliation: r['institution-name']?.[0] ?? '',
      snippet: r['other-name']?.[0] ?? '',
      raw_data: r,
      fetched_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ── Google Custom Search API ───────────────────────────────────────────────
// Butuh GOOGLE_SEARCH_API_KEY dan GOOGLE_SEARCH_CX di env
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
    const q   = encodeURIComponent(queryText);
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${q}&num=5`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.items ?? [];

    return items.map((item: any) => {
      // Ekstrak sinyal dari snippet dan title
      const combined = `${item.title ?? ''} ${item.snippet ?? ''}`;

      return {
        source,
        source_url: item.link ?? '',
        title:      item.title ?? '',
        snippet:    item.snippet ?? '',
        found_name: extractNameFromText(combined),
        found_affiliation: extractAffiliationFromText(combined),
        found_role: extractRoleFromText(combined),
        found_location: extractLocationFromText(combined),
        activity_year: extractYearFromText(combined),
        raw_data: item,
        fetched_at: new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

// ── SerpAPI untuk Scholar (opsional, butuh key) ────────────────────────────
export async function fetchFromScholar(
  name: string,
  affiliation: string
): Promise<Partial<TrackingEvidence>[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    // Fallback: gunakan Google Custom Search dengan site:scholar.google.com
    return fetchFromGoogle(`"${name}" "${affiliation}" scholar`, 'scholar');
  }

  try {
    const q   = encodeURIComponent(`${name} ${affiliation}`);
    const url = `https://serpapi.com/search.json?engine=google_scholar&q=${q}&api_key=${apiKey}&num=5`;

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

// ── GitHub API (gratis, rate-limited 60 req/jam tanpa auth) ───────────────
export async function fetchFromGitHub(
  name: string
): Promise<Partial<TrackingEvidence>[]> {
  try {
    const q   = encodeURIComponent(name);
    const url = `https://api.github.com/search/users?q=${q}+type:user&per_page=3`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data = await res.json();
    const users = data?.items ?? [];

    // Untuk setiap user, ambil detail
    const results: Partial<TrackingEvidence>[] = [];
    for (const user of users.slice(0, 3)) {
      const detailRes = await fetch(user.url, { headers });
      if (!detailRes.ok) continue;
      const detail = await detailRes.json();

      results.push({
        source: 'github' as TrackingSource,
        source_url: detail.html_url ?? '',
        title: `GitHub: ${detail.login}`,
        snippet: detail.bio ?? '',
        found_name: detail.name ?? detail.login ?? '',
        found_affiliation: detail.company ?? '',
        found_location: detail.location ?? '',
        found_role: 'Software Developer',
        raw_data: detail,
        fetched_at: new Date().toISOString(),
      });
    }

    return results;
  } catch {
    return [];
  }
}

// ── Text extraction helpers ────────────────────────────────────────────────

function extractNameFromText(text: string): string {
  // Heuristic: cari pola "Nama - Jabatan" atau nama dengan kapital
  const match = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})/);
  return match?.[1] ?? '';
}

function extractAffiliationFromText(text: string): string {
  const affiliationKeywords = [
    'universitas', 'university', 'institut', 'institute',
    'pt ', 'cv ', 'tbk', 'corp', 'inc', 'ltd', 'co.',
  ];
  const lower = text.toLowerCase();
  for (const kw of affiliationKeywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      return text.slice(idx, idx + 60).split(/[,|·\n]/)[0].trim();
    }
  }
  return '';
}

function extractRoleFromText(text: string): string {
  const roles = [
    'software engineer', 'data scientist', 'developer', 'manager',
    'director', 'CEO', 'CTO', 'lecturer', 'dosen', 'researcher',
    'analis', 'konsultan', 'mahasiswa', 'professor', 'dr.', 'dr ',
  ];
  const lower = text.toLowerCase();
  for (const role of roles) {
    if (lower.includes(role.toLowerCase())) {
      return role;
    }
  }
  return '';
}

function extractLocationFromText(text: string): string {
  const cities = [
    'jakarta', 'surabaya', 'bandung', 'malang', 'yogyakarta', 'semarang',
    'medan', 'makassar', 'bali', 'denpasar', 'singapore', 'malaysia',
    'australia', 'netherlands', 'germany', 'united states', 'japan',
  ];
  const lower = text.toLowerCase();
  for (const city of cities) {
    if (lower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  return '';
}

function extractYearFromText(text: string): number | undefined {
  const match = text.match(/\b(20\d{2}|19[89]\d)\b/);
  return match ? parseInt(match[1]) : undefined;
}

// ── Dispatcher: pilih fetcher berdasarkan source ───────────────────────────
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
    case 'github':
      return fetchFromGitHub(nameVariant);
    case 'google':
    case 'linkedin':
    case 'researchgate':
    case 'web':
    default:
      return fetchFromGoogle(queryText, source);
  }
}
