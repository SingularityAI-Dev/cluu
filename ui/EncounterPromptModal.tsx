'use client';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/state/StoreProvider';

const MAX_PROMPT_CHARS = 500;

interface AttemptResponse {
  grade: {
    verdict: 'fail' | 'pass' | 'flair';
    generatedResponse: string;
  };
}

interface EncounterPromptModalProps {
  onResolved?: (grade: 'pass' | 'flair') => void;
}

function rewardMessage(verdict: 'fail' | 'pass' | 'flair'): string {
  if (verdict === 'flair') {
    return 'The sunflower unfurls, petals trembling. Three bees arrive.';
  }

  if (verdict === 'pass') {
    return 'The sunflower unfurls. A bee arrives.';
  }

  return 'The plant stirs, but does not quite wake. Try describing it more.';
}

export function EncounterPromptModal({ onResolved }: EncounterPromptModalProps = {}) {
  const currentEncounterId = useGameStore((state) => state.currentEncounterId);
  const encounterResult = useGameStore((state) => state.encounterResult);
  const closeEncounter = useGameStore((state) => state.closeEncounter);
  const setEncounterResult = useGameStore((state) => state.setEncounterResult);

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentEncounterId) {
      setPrompt('');
      setError(null);
      queueMicrotask(() => textareaRef.current?.focus());
    }
  }, [currentEncounterId]);

  if (!currentEncounterId) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/encounter/attempt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ encounterId: currentEncounterId, userPrompt: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`Encounter request failed with ${response.status}`);
      }

      const data = (await response.json()) as AttemptResponse;
      setEncounterResult({ verdict: data.grade.verdict, message: rewardMessage(data.grade.verdict) });
      if (data.grade.verdict === 'pass' || data.grade.verdict === 'flair') {
        onResolved?.(data.grade.verdict);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Encounter request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog open className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-stone-50 p-5 text-stone-900 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Withered Sunflower</h2>
            <p className="text-sm text-lime-800">Describe what this plant should become.</p>
          </div>
          <button
            type="button"
            onClick={closeEncounter}
            className="rounded-lg px-2 py-1 text-lg font-bold text-stone-900 hover:bg-lime-100"
            aria-label="Close encounter prompt"
          >
            ×
          </button>
        </div>

        <label className="mb-2 block text-sm font-semibold" htmlFor="encounter-prompt">
          Your prompt
        </label>
        <textarea
          ref={textareaRef}
          id="encounter-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, MAX_PROMPT_CHARS))}
          maxLength={MAX_PROMPT_CHARS}
          rows={5}
          className="mb-2 w-full rounded-xl border border-lime-500 bg-white p-3 text-base outline-none focus:ring-2 focus:ring-amber-200"
          placeholder="A tall sunflower with golden petals and fresh green leaves..."
        />

        <div className="mb-3 flex items-center justify-between text-xs text-lime-800">
          <span>{prompt.length}/{MAX_PROMPT_CHARS}</span>
          {encounterResult && <span>Result: {encounterResult.verdict}</span>}
        </div>

        {encounterResult && (
          <div className="mb-3 rounded-xl bg-lime-100 p-3 text-sm font-semibold text-stone-900">
            {encounterResult.message}
          </div>
        )}

        {error && <div className="mb-3 rounded-xl bg-red-100 p-3 text-sm text-red-900">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeEncounter}
            className="rounded-xl px-4 py-2 font-bold text-lime-900 hover:bg-lime-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || prompt.trim().length === 0}
            className="rounded-xl bg-amber-200 px-4 py-2 font-bold text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Growing…' : 'Grow'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
