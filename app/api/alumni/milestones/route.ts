import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const alumni_id = req.nextUrl.searchParams.get('alumni_id');
  const type = req.nextUrl.searchParams.get('type');

  if (type === 'certs') {
    const { data } = await supabase
      .from('skills_certifications')
      .select('*')
      .eq('alumni_id', alumni_id || '');
    return NextResponse.json(data || []);
  }

  const { data, error } = await supabase
    .from('career_milestones')
    .select('*')
    .eq('alumni_id', alumni_id || '')
    .order('start_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase
    .from('career_milestones')
    .insert({ ...body, verification_status: 'pending' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  const { data, error } = await supabase
    .from('career_milestones')
    .update({ verification_status: status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
