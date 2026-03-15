import { NextRequest, NextResponse } from 'next/server';

// Supabase SSR kadang redirect ke /auth/login — tangkap dan teruskan ke /login
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/login', req.url));
}
