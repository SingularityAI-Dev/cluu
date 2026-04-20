import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cluu',
  description: 'A cozy browser game that teaches prompting through gameplay.',
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
