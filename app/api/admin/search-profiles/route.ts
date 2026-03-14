import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  getAllSearchProfiles,
  createSearchProfile,
  updateSearchProfile,
  bulkCreateSearchProfiles,
  setOptOut,
} from '@/services/searchProfileService';

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data?.role === 'admin' ? user : null;
}

// GET — list all search profiles
export async function GET() {
  const supabase = createSupabaseServerClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await getAllSearchProfiles();
  return NextResponse.json(data);
}

// POST — create or bulk-create
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  // Bulk create
  if (body.bulk === true) {
    const result = await bulkCreateSearchProfiles();
    return NextResponse.json(result);
  }

  // Single create — butuh alumni_id
  const { alumni_id, ...profileInput } = body;
  if (!alumni_id) return NextResponse.json({ error: 'alumni_id required' }, { status: 400 });

  const { data: alumni } = await supabase
    .from('alumni_profiles').select('*').eq('id', alumni_id).single();
  if (!alumni) return NextResponse.json({ error: 'Alumni not found' }, { status: 404 });

  const profile = await createSearchProfile(alumni, profileInput);
  return NextResponse.json(profile);
}

// PATCH — update profile or toggle opt-out
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { alumni_id, opt_out, opt_out_reason, ...updates } = body;
  if (!alumni_id) return NextResponse.json({ error: 'alumni_id required' }, { status: 400 });

  if (opt_out !== undefined) {
    await setOptOut(alumni_id, opt_out, opt_out_reason);
    return NextResponse.json({ success: true });
  }

  const profile = await updateSearchProfile(alumni_id, updates);
  return NextResponse.json(profile);
}
