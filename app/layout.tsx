import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Comanda — pedidos pelo WhatsApp', template: '%s · Comanda' },
  description: 'Receba pedidos de delivery com cardápio online, painel e atendimento no WhatsApp.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png?v=3', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-192.png?v=3', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=3',
  },
};

export const viewport: Viewport = { themeColor: '#F25C05', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
