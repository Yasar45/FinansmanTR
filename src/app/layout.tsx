import '@total-typescript/ts-reset';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/app/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Çiftlik Pazar | FarmHub TR',
  description:
    'Türkiye odaklı dijital çiftlik ekonomisi: hayvanlar, seralar, pazar ve güvenli TRY cüzdanı.',
  metadataBase: new URL('https://example.com'),
  alternates: {
    languages: {
      tr: 'https://example.com/tr',
      en: 'https://example.com/en'
    }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
