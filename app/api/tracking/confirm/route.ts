import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// POST /api/tracking/confirm
// Body: { result_id, action: 'confirmed' | 'rejected' }
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { result_id, action } = await req.json();
  if (!result_id || !['confirmed', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Verifikasi result ini milik alumni yang login
  const { data: profile } = await supabase
    .from('alumni_profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: result } = await supabase
    .from('tracking_results').select('alumni_id').eq('id', result_id).single();
  if (!result || result.alumni_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('tracking_results')
    .update({
      alumni_confirmation: action,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', result_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Jika confirmed → buat career milestone otomatis
  if (action === 'confirmed') {
    const { data: fullResult } = await supabase
      .from('tracking_results').select('*').eq('id', result_id).single();

    if (fullResult?.found_position && fullResult?.found_company) {
      await supabase.from('career_milestones').insert({
        alumni_id:            profile.id,
        company_name:         fullResult.found_company,
        position_title:       fullResult.found_position,
        start_date:           `${fullResult.found_year ?? new Date().getFullYear()}-01-01`,
        classification_label: 'other',
        verification_status:  'verified', // langsung verified karena alumni sendiri yang konfirmasi
      });
    }
  }

  return NextResponse.json({ success: true, action });
}
