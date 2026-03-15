import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// Handles email confirmation links from Supabase
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type');
  const next       = searchParams.get('next') ?? '/dashboard';

  if (token_hash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
}
