import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cluu',
  description: 'CLUU — a clockwork adventure that teaches Claude Code through gameplay.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
