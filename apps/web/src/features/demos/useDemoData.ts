import type { ReplayData } from '@cs2/core';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { describeError } from '../../lib/errors';
import type { PublicDemo, ScoreboardRow } from '../../lib/types';

const POLL_INTERVAL_MS = 2000;

export type DemoData =
  | { status: 'loading' }
  | { status: 'processing'; demo: PublicDemo }
  | { status: 'failed'; demo: PublicDemo }
  | { status: 'ready'; demo: PublicDemo; replay: ReplayData; scoreboard: ScoreboardRow[] }
  | { status: 'error'; message: string };

/** Loads a demo, waits for its analysis to finish, then fetches the replay and scoreboard. */
export function useDemoData(demoId: string | undefined): DemoData {
  const { client } = useAuth();
  const [data, setData] = useState<DemoData>({ status: 'loading' });

  useEffect(() => {
    if (!demoId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run(id: string) {
      try {
        const demo = await client.getDemo(id);
        if (cancelled) return;
        if (demo.status === 'processing') {
          setData({ status: 'processing', demo });
          timer = setTimeout(() => void run(id), POLL_INTERVAL_MS);
        } else if (demo.status === 'failed') {
          setData({ status: 'failed', demo });
        } else {
          const [replay, scoreboard] = await Promise.all([
            client.getReplay(id),
            client.getScoreboard(id),
          ]);
          if (!cancelled) setData({ status: 'ready', demo, replay, scoreboard });
        }
      } catch (error) {
        if (!cancelled) setData({ status: 'error', message: describeError(error) });
      }
    }

    void run(demoId);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, demoId]);

  return demoId ? data : { status: 'error', message: 'Élément introuvable.' };
}
