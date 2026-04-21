// ui/ConsentBanner.test.tsx
// D-20 + Pitfall 12: verifies banner renders, buttons are equal weight (no dark pattern),
// and consent persistence flows through setConsent.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_KEY, getConsent } from '@/lib/consent/store';
import { ConsentBanner } from './ConsentBanner';

describe('<ConsentBanner />', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  it('renders when no consent decision exists', async () => {
    render(<ConsentBanner />);
    expect(await screen.findByTestId('consent-accept')).toBeDefined();
    expect(await screen.findByTestId('consent-decline')).toBeDefined();
  });

  it('uses neutral copy (D-20)', async () => {
    render(<ConsentBanner />);
    const text = await screen.findByText(/Accept or decline — no dark patterns/);
    expect(text).toBeDefined();
  });

  it('both buttons have identical inline styles (no dark pattern)', async () => {
    render(<ConsentBanner />);
    const accept = (await screen.findByTestId('consent-accept')) as HTMLButtonElement;
    const decline = (await screen.findByTestId('consent-decline')) as HTMLButtonElement;
    // Identical inline style strings — source-level proof that both buttons share
    // the exact same style object. D-20 dark-pattern mitigation.
    expect(accept.getAttribute('style')).toBe(decline.getAttribute('style'));
  });

  it('Accept click persists consent and hides banner', async () => {
    const { rerender } = render(<ConsentBanner />);
    const btn = await screen.findByTestId('consent-accept');
    fireEvent.click(btn);
    expect(getConsent()?.decision).toBe('accepted');
    rerender(<ConsentBanner />);
    expect(screen.queryByTestId('consent-accept')).toBeNull();
  });

  it('Decline click persists consent and hides banner', async () => {
    const { rerender } = render(<ConsentBanner />);
    const btn = await screen.findByTestId('consent-decline');
    fireEvent.click(btn);
    expect(getConsent()?.decision).toBe('declined');
    rerender(<ConsentBanner />);
    expect(screen.queryByTestId('consent-decline')).toBeNull();
  });

  it('does not render when consent already set', async () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ decision: 'accepted', decidedAt: new Date().toISOString() }),
    );
    render(<ConsentBanner />);
    // Let the useEffect tick resolve.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('consent-accept')).toBeNull();
  });
});
