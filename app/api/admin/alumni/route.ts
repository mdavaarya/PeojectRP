import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabaseServer';
import { getAllAlumni, deleteAlumni } from '@/services/adminService';

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

  try {
    const data = await getAllAlumni();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API] /admin/alumni GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { alumni_id, user_id } = await req.json();
  if (!alumni_id || !user_id) {
    return NextResponse.json({ error: 'alumni_id and user_id required' }, { status: 400 });
  }

  try {
    await deleteAlumni(alumni_id, user_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] /admin/alumni DELETE error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
