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

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('search_profiles')
    .select('*, alumni_profiles(full_name, nim, study_program, graduation_year)')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getAdminClient();
  const body = await req.json();

  // Bulk create
  if (body.bulk === true) {
    const { data: allAlumni } = await supabase.from('alumni_profiles').select('*');
    const { data: existing } = await supabase.from('search_profiles').select('alumni_id');
    const existingIds = new Set((existing ?? []).map((p: any) => p.alumni_id));
    const toCreate = (allAlumni ?? []).filter((a: any) => !existingIds.has(a.id));

    let created = 0;
    for (const alumni of toCreate) {
      const parts = alumni.full_name.trim().split(/\s+/);
      const variants = [alumni.full_name];
      if (parts.length >= 2) {
        variants.push(`${parts[0]} ${parts[parts.length-1]}`);
        variants.push(`${parts[0][0]}. ${parts[parts.length-1]}`);
      }

      await supabase.from('search_profiles').upsert({
        alumni_id: alumni.id,
        name_variants: variants,
        affiliation_keywords: ['Universitas Muhammadiyah Malang', 'UMM', alumni.study_program],
        context_keywords: [alumni.study_program.toLowerCase(), String(alumni.graduation_year), 'malang'],
        is_low_context: parts.length < 2,
        is_opted_out: false,
      }, { onConflict: 'alumni_id' });
      created++;
    }

    return NextResponse.json({ created, skipped: existingIds.size });
  }

  // Single create
  const { alumni_id, ...profileInput } = body;
  if (!alumni_id) return NextResponse.json({ error: 'alumni_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('search_profiles')
    .upsert({ alumni_id, ...profileInput }, { onConflict: 'alumni_id' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getAdminClient();
  const body = await req.json();
  const { alumni_id, opt_out, opt_out_reason, ...updates } = body;
  if (!alumni_id) return NextResponse.json({ error: 'alumni_id required' }, { status: 400 });

  if (opt_out !== undefined) {
    await supabase.from('search_profiles').update({
      is_opted_out: opt_out,
      opted_out_at: opt_out ? new Date().toISOString() : null,
      opted_out_reason: opt_out_reason ?? null,
    }).eq('alumni_id', alumni_id);
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase
    .from('search_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('alumni_id', alumni_id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
