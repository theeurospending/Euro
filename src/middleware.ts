import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, DEFAULT_LOCALE } from '@/i18n/locales';

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookie && isLocale(cookie)) return cookie;
  const accept = request.headers.get('accept-language');
  if (accept) {
    for (const part of accept.split(',')) {
      const code = part.split(';')[0].trim().slice(0, 2).toLowerCase();
      if (isLocale(code)) return code;
    }
  }
  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Locale routing for public pages. Admin, API, OG images, sitemap/robots and
  // static files keep their plain (unprefixed) paths.
  const localeManaged = !(
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('/og') ||
    path === '/sitemap.xml' ||
    path === '/robots.txt' ||
    path === '/icon.svg' ||
    /\.[^/]+$/.test(path)
  );

  const fwdHeaders = new Headers(request.headers);
  if (localeManaged) {
    const seg = path.split('/')[1];
    if (isLocale(seg)) {
      fwdHeaders.set('x-locale', seg);
    } else {
      const locale = detectLocale(request);
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${path === '/' ? '' : path}`;
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({ request: { headers: fwdHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: fwdHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Public allow-list
  if (path === '/admin/login' || !path.startsWith('/admin')) {
    return response;
  }

  // /admin/* — must be signed in AND must be admin
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin, deleted_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin || profile.deleted_at) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('error', 'not_admin');
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
