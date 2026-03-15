import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { result_id, action } = await req.json(); // action: 'confirm' | 'reject'
  if (!result_id || !['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Ensure alumni owns this result
  const { data: profile } = await supabase
    .from('alumni_profiles').select('id').eq('user_id', user.id).single();
  const { data: result } = await supabase
    .from('tracking_results').select('alumni_id').eq('id', result_id).single();

  if (!profile || result?.alumni_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';
  const { error } = await supabase
    .from('tracking_results')
    .update({
      match_status: newStatus,
      alumni_confirmed_at: new Date().toISOString(),
    })
    .eq('id', result_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If confirmed → auto-create career milestone from result
  if (action === 'confirm') {
    const { data: fullResult } = await supabase
      .from('tracking_results').select('*').eq('id', result_id).single();
    if (fullResult?.found_title && fullResult?.found_institution) {
      await supabase.from('career_milestones').insert({
        alumni_id: profile.id,
        company_name: fullResult.found_institution,
        position_title: fullResult.found_title,
        start_date: fullResult.found_year
          ? `${fullResult.found_year}-01-01`
          : new Date().toISOString().split('T')[0],
        classification_label: 'other',
        verification_status: 'verified', // auto-verified karena alumni konfirmasi
      });
    }
  }

  return NextResponse.json({ success: true, status: newStatus });
}
