import { useCallback, useEffect, useRef, useState } from 'react';

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

interface ClockOptions {
  autoPlay?: boolean;
  initialSpeed?: number;
}

export interface ReplayClock {
  /** Seconds since the start of the round. */
  time: number;
  playing: boolean;
  speed: number;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(seconds: number): void;
  setSpeed(speed: number): void;
}

/**
 * Playback clock for a round of `duration` seconds, driven by requestAnimationFrame.
 * Playback stops at the end; pressing play again restarts from the beginning.
 * Mount it with a `key` per round so a new round starts from zero.
 */
export function useReplayClock(duration: number, options: ClockOptions = {}): ReplayClock {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(options.autoPlay ?? false);
  const [speed, setSpeed] = useState(options.initialSpeed ?? 1);
  const timeRef = useRef(0);

  const update = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), duration);
      timeRef.current = clamped;
      setTime(clamped);
    },
    [duration],
  );

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) {
        const next = timeRef.current + ((now - previous) / 1000) * speed;
        update(next);
        if (next >= duration) {
          setPlaying(false);
          return;
        }
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, duration, update]);

  const play = useCallback(() => {
    if (timeRef.current >= duration) update(0);
    setPlaying(true);
  }, [duration, update]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  return { time, playing, speed, play, pause, toggle, seek: update, setSpeed };
}
