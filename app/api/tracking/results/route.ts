import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();

  const alumniId  = req.nextUrl.searchParams.get('alumni_id');
  const latestOnly = req.nextUrl.searchParams.get('latest') !== 'false';

  let query = supabase
    .from('tracking_results')
    .select(`
      *,
      alumni_profiles(full_name, nim, study_program, graduation_year),
      tracking_evidence(*)
    `)
    .order('created_at', { ascending: false });

  if (userData?.role === 'admin') {
    if (alumniId) query = query.eq('alumni_id', alumniId);
    if (latestOnly) query = query.eq('is_latest', true);
  } else {
    // Alumni hanya lihat hasil milik sendiri
    const { data: profile } = await supabase
      .from('alumni_profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json([]);
    query = query.eq('alumni_id', profile.id).eq('is_latest', true);
  }

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}
