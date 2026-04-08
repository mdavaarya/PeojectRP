import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data?.role === 'admin' ? user : null;
}

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const body = rows.map(row =>
    keys.map(k => {
      const val = row[k] ?? '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getAdminClient();
  const type = req.nextUrl.searchParams.get('type') || 'alumni';
  let csv = '';

  if (type === 'alumni') {
    const { data } = await supabase
      .from('alumni_profiles')
      .select('full_name,nim,graduation_year,study_program,phone_number,employment_sector,linkedin_url,instagram_url,facebook_url,tiktok_url,tracking_status,current_position,current_company')
      .order('full_name');
    csv = toCSV(data || []);
  } else if (type === 'milestones') {
    const { data } = await supabase
      .from('career_milestones')
      .select('alumni_profiles(full_name,nim), company_name, position_title, start_date, classification_label, verification_status, work_address, company_social_media');
    const flat = (data || []).map((r: any) => ({
      full_name: r.alumni_profiles?.full_name,
      nim: r.alumni_profiles?.nim,
      company_name: r.company_name,
      position_title: r.position_title,
      start_date: r.start_date,
      classification_label: r.classification_label,
      verification_status: r.verification_status,
      work_address: r.work_address,
      company_social_media: r.company_social_media,
    }));
    csv = toCSV(flat);
  } else if (type === 'certifications') {
    const { data } = await supabase
      .from('skills_certifications')
      .select('alumni_profiles(full_name,nim), certificate_name, issuer, year');
    const flat = (data || []).map((r: any) => ({
      full_name: r.alumni_profiles?.full_name,
      nim: r.alumni_profiles?.nim,
      certificate_name: r.certificate_name,
      issuer: r.issuer,
      year: r.year,
    }));
    csv = toCSV(flat);
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="silumni_${type}.csv"`,
    },
  });
}