import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Static & API — skip
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response;
  }

  // Public routes
  const publicRoutes = ['/', '/login', '/register'];
  if (publicRoutes.includes(pathname)) {
    await supabase.auth.getSession();
    return response;
  }

  if (pathname.startsWith('/auth')) {
    return response;
  }

  // Get session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.log(`[MW] No session → redirect to login (path: ${pathname})`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log(`[MW] Session found: ${session.user.email} (path: ${pathname})`);

  // Check role for admin routes
  if (pathname.startsWith('/admin')) {
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log(`[MW] Admin check: userId=${session.user.id} role=${userData?.role} error=${error?.message}`);

    if (userData?.role !== 'admin') {
      console.log(`[MW] Not admin → redirect to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    console.log(`[MW] Admin confirmed → allow`);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};