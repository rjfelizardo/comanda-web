import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE = 'comanda.bridgeatravessia.com.br';

export function GET(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const admin = host === 'admin.' + BASE;

  const manifest = {
    id: admin ? '/?app=admin' : '/painel',
    name: admin ? 'Admin · Comanda' : 'Comanda',
    short_name: admin ? 'Admin Comanda' : 'Comanda',
    description: 'Comanda: pedidos de delivery pelo WhatsApp, com loja online e painel.',
    start_url: admin ? '/' : '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F97316',
    theme_color: '#F25C05',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-any-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-any-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' },
  });
}
