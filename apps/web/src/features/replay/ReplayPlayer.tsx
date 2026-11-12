import { interpolateFrame } from '@cs2/core';
import type { KillEvent, ReplayData, ReplayRound } from '@cs2/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatClock } from '../../lib/format';
import { drawReplayFrame } from './drawFrame';
import {
  aliveCounts,
  createCalibration,
  getBackdrop,
  recentKillFeed,
  visibleKills,
} from './replayView';
import { PLAYBACK_SPEEDS, useReplayClock } from './useReplayClock';
import './replay.css';

const BOARD_WIDTH = 960;
const BOARD_HEIGHT = 600;

interface ReplayPlayerProps {
  replay: ReplayData;
  autoPlay?: boolean;
  /** Player ringed on the board (e.g. "me"). */
  highlightId?: string | null;
}

export function ReplayPlayer({ replay, autoPlay = false, highlightId = null }: ReplayPlayerProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const round = replay.rounds[roundIndex];
  if (!round) return <p className="muted">Aucun round à afficher.</p>;

  return (
    <section className="replay" aria-label="Replay 2D">
      <div className="replay__rounds" role="group" aria-label="Rounds">
        {replay.rounds.map((r, index) => (
          <button
            key={r.number}
            type="button"
            className="replay__round"
            aria-pressed={index === roundIndex}
            onClick={() => setRoundIndex(index)}
          >
            Round {r.number}
            {r.winner && (
              <span className={`replay__winner replay__winner--${r.winner}`}>{r.winner}</span>
            )}
          </button>
        ))}
      </div>
      <RoundView
        key={round.number}
        replay={replay}
        round={round}
        autoPlay={autoPlay}
        highlightId={highlightId}
      />
    </section>
  );
}

interface RoundViewProps {
  replay: ReplayData;
  round: ReplayRound;
  autoPlay: boolean;
  highlightId: string | null;
}

function RoundView({ replay, round, autoPlay, highlightId }: RoundViewProps) {
  const clock = useReplayClock(round.durationSeconds, { autoPlay });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calibration = useMemo(
    () => createCalibration(replay, { width: BOARD_WIDTH, height: BOARD_HEIGHT }),
    [replay],
  );
  const backdrop = useMemo(() => getBackdrop(replay.map), [replay.map]);
  const frame = useMemo(() => interpolateFrame(round.frames, clock.time), [round, clock.time]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = BOARD_WIDTH * ratio;
    canvas.height = BOARD_HEIGHT * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawReplayFrame(ctx, {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      calibration,
      backdrop,
      frame,
      kills: visibleKills(round.kills, clock.time),
      names: replay.players,
      highlightId,
    });
  }, [calibration, backdrop, frame, round.kills, clock.time, replay.players, highlightId]);

  const alive = aliveCounts(frame);
  const feed = recentKillFeed(round.kills, clock.time);

  return (
    <div className="replay__stage">
      <div className="replay__hud">
        <span className="replay__team replay__team--CT">CT {alive.CT}</span>
        <span className="replay__clock" aria-label="Temps écoulé">
          {formatClock(clock.time)} / {formatClock(round.durationSeconds)}
        </span>
        <span className="replay__team replay__team--T">T {alive.T}</span>
      </div>

      <canvas
        ref={canvasRef}
        className="replay__canvas"
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        role="img"
        aria-label={`Carte du round ${round.number}, ${alive.CT} CT et ${alive.T} T en vie`}
      />

      <div className="replay__controls">
        <button type="button" className="btn btn--primary" onClick={clock.toggle}>
          {clock.playing ? 'Pause' : 'Lecture'}
        </button>
        <div className="replay__timeline">
          <input
            type="range"
            min={0}
            max={round.durationSeconds}
            step={0.05}
            value={clock.time}
            aria-label="Position dans le round"
            onChange={(event) => clock.seek(Number(event.target.value))}
          />
          <div className="replay__markers" aria-hidden="true">
            {round.kills.map((kill, index) => (
              <span
                key={index}
                className="replay__marker"
                style={{ left: `${(kill.t / round.durationSeconds) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <label className="replay__speed">
          <span className="visually-hidden">Vitesse de lecture</span>
          <select
            value={clock.speed}
            onChange={(event) => clock.setSpeed(Number(event.target.value))}
          >
            {PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                ×{speed}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="replay__feed" aria-label="Éliminations">
        {feed.map((kill, index) => (
          <li key={index}>{describeKill(kill, replay.players)}</li>
        ))}
      </ol>
    </div>
  );
}

function describeKill(kill: KillEvent, names: Record<string, string>): string {
  const victim = names[kill.victimId] ?? kill.victimId;
  if (!kill.killerId) return `${victim} est mort`;
  const killer = names[kill.killerId] ?? kill.killerId;
  return `${killer} ▸ ${victim} (${kill.weapon}${kill.headshot ? ', tête' : ''})`;
}
