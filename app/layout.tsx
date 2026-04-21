import type { Metadata } from 'next';
import { PostHogProvider } from '@/lib/analytics/posthog-provider';
import { StoreProvider } from '@/state/StoreProvider';
import { ConsentBanner } from '@/ui/ConsentBanner';
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
      <body>
        <StoreProvider>
          <PostHogProvider>
            {children}
            <ConsentBanner />
          </PostHogProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
