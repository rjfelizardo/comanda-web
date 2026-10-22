import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const BASE = 'comanda.bridgeatravessia.com.br';
const RESERVED = new Set(['www', 'painel', 'app', 'api', 'admin', 'login']);

export async function middleware(request: NextRequest) {
  // loja.comanda.bridgeatravessia.com.br -> mostra a loja "loja" (a raiz vira /loja)
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  if (host.endsWith('.' + BASE)) {
    const slug = host.slice(0, -(BASE.length + 1));
    if (/^[a-z0-9-]+$/.test(slug) && !RESERVED.has(slug) && request.nextUrl.pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}`;
      return NextResponse.rewrite(url);
    }
  }
  if (request.nextUrl.pathname === '/') return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  if (!data.user && request.nextUrl.pathname.startsWith('/painel')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/', '/painel/:path*', '/login'],
};
