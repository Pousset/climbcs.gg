import type { KillEvent, ReplayData, ReplayRound, Team } from './types';

/** A death counts as "traded" when a teammate kills the killer within this window. */
export const TRADE_WINDOW_SECONDS = 5;

export interface PlayerStats {
  id: string;
  name: string;
  rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  damage: number;
  tradedDeaths: number;
  /** Rounds with a Kill, an Assist, the player Survived, or the death was Traded. */
  kastRounds: number;
  kd: number;
  /** 0-100 */
  hsPercent: number;
  /** Average damage per round. */
  adr: number;
  /** 0-1 */
  kast: number;
}

/** Team of every player in a round, taken from the first frame they appear in. */
export function getRoundTeams(round: ReplayRound): Map<string, Team> {
  const teams = new Map<string, Team>();
  for (const frame of round.frames) {
    for (const p of frame.players) if (!teams.has(p.id)) teams.set(p.id, p.team);
  }
  return teams;
}

function areEnemies(a: string, b: string, teams: Map<string, Team>): boolean {
  const ta = teams.get(a);
  const tb = teams.get(b);
  return ta === undefined || tb === undefined || ta !== tb;
}

/** True when a teammate of the victim killed the killer shortly after the victim died. */
export function isTradedDeath(
  death: KillEvent,
  kills: KillEvent[],
  teams: Map<string, Team>,
  windowSeconds = TRADE_WINDOW_SECONDS,
): boolean {
  if (death.killerId === null || !areEnemies(death.killerId, death.victimId, teams)) return false;
  const victimTeam = teams.get(death.victimId);
  return kills.some(
    (k) =>
      k !== death &&
      k.victimId === death.killerId &&
      k.t >= death.t &&
      k.t - death.t <= windowSeconds &&
      k.killerId !== null &&
      teams.get(k.killerId) === victimTeam,
  );
}

type Accumulator = Omit<PlayerStats, 'name' | 'kd' | 'hsPercent' | 'adr' | 'kast'>;

const emptyAccumulator = (id: string): Accumulator => ({
  id,
  rounds: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  headshots: 0,
  damage: 0,
  tradedDeaths: 0,
  kastRounds: 0,
});

/** Per-player statistics for the whole match, sorted by kills (then name). */
export function computeScoreboard(data: ReplayData): PlayerStats[] {
  const acc = new Map<string, Accumulator>();
  const get = (id: string): Accumulator => {
    let a = acc.get(id);
    if (!a) acc.set(id, (a = emptyAccumulator(id)));
    return a;
  };

  for (const round of data.rounds) {
    const teams = getRoundTeams(round);
    const present = new Set<string>(teams.keys());
    for (const k of round.kills) {
      present.add(k.victimId);
      if (k.killerId) present.add(k.killerId);
    }
    for (const d of round.damages) {
      present.add(d.attackerId);
      present.add(d.victimId);
    }

    const contributed = new Set<string>();
    const died = new Set<string>();
    const traded = new Set<string>();

    for (const kill of round.kills) {
      const victim = get(kill.victimId);
      victim.deaths += 1;
      died.add(kill.victimId);
      if (isTradedDeath(kill, round.kills, teams)) {
        victim.tradedDeaths += 1;
        traded.add(kill.victimId);
      }
      if (kill.killerId && areEnemies(kill.killerId, kill.victimId, teams)) {
        const killer = get(kill.killerId);
        killer.kills += 1;
        if (kill.headshot) killer.headshots += 1;
        contributed.add(kill.killerId);
      }
      if (kill.assisterId && areEnemies(kill.assisterId, kill.victimId, teams)) {
        get(kill.assisterId).assists += 1;
        contributed.add(kill.assisterId);
      }
    }

    for (const dmg of round.damages) {
      if (areEnemies(dmg.attackerId, dmg.victimId, teams)) get(dmg.attackerId).damage += dmg.amount;
    }

    for (const id of present) {
      const a = get(id);
      a.rounds += 1;
      if (contributed.has(id) || !died.has(id) || traded.has(id)) a.kastRounds += 1;
    }
  }

  return [...acc.values()]
    .map((a) => ({
      ...a,
      name: data.players[a.id] ?? a.id,
      kd: a.deaths === 0 ? a.kills : a.kills / a.deaths,
      hsPercent: a.kills === 0 ? 0 : (a.headshots / a.kills) * 100,
      adr: a.rounds === 0 ? 0 : a.damage / a.rounds,
      kast: a.rounds === 0 ? 0 : a.kastRounds / a.rounds,
    }))
    .sort((x, y) => y.kills - x.kills || x.name.localeCompare(y.name));
}
