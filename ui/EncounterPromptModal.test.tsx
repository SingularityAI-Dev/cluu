import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameStore } from '@/state/gameStore';
import { StoreProvider } from '@/state/StoreProvider';
import { EncounterPromptModal } from './EncounterPromptModal';

function renderWithStore(initialState: Partial<GameStore> = {}) {
  return render(
    <StoreProvider initialState={initialState}>
      <EncounterPromptModal />
    </StoreProvider>,
  );
}

describe('<EncounterPromptModal />', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when no encounter is open', () => {
    renderWithStore();

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens when the store opens an encounter', () => {
    renderWithStore({ currentEncounterId: 'meadow_withered_sunflower' });

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Withered Sunflower')).toBeDefined();
    expect(screen.getByLabelText('Your prompt')).toBeDefined();
  });

  it('disables submit while the API request is loading', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    renderWithStore({ currentEncounterId: 'meadow_withered_sunflower' });

    fireEvent.change(screen.getByLabelText('Your prompt'), {
      target: { value: 'a tall golden sunflower with trembling petals' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Grow' }));

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /grow/i });
      expect(submitButton.hasAttribute('disabled')).toBe(true);
      expect(submitButton.textContent).toBe('Growing…');
    });
  });

  it('shows feedback after the store receives an encounter result', () => {
    renderWithStore({
      currentEncounterId: 'meadow_withered_sunflower',
      encounterResult: {
        verdict: 'flair',
        message: 'The sunflower unfurls, petals trembling. Three bees arrive.',
      },
    });

    expect(screen.getByText('The sunflower unfurls, petals trembling. Three bees arrive.')).toBeDefined();
    expect(screen.getByText('Result: flair')).toBeDefined();
  });
});
