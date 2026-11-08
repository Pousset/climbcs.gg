/** Side a player is on during a round. */
export type Team = 'T' | 'CT';

/** Subscription tier of an account. */
export type Plan = 'free' | 'premium';

export interface Point2D {
  x: number;
  y: number;
}

/** State of one player at one instant (world coordinates, degrees for yaw). */
export interface PlayerSample {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  team: Team;
}

/** Snapshot of every player; `t` is in seconds since the round started. */
export interface Frame {
  t: number;
  players: PlayerSample[];
}

export interface KillEvent {
  t: number;
  /** `null` for world kills (fall damage, suicide command...). */
  killerId: string | null;
  victimId: string;
  assisterId: string | null;
  weapon: string;
  headshot: boolean;
}

export interface DamageEvent {
  t: number;
  attackerId: string;
  victimId: string;
  amount: number;
}

export interface BombTimeline {
  plantedAt: number | null;
  defusedAt: number | null;
  explodedAt: number | null;
}

export interface ReplayRound {
  number: number;
  winner: Team | null;
  durationSeconds: number;
  frames: Frame[];
  kills: KillEvent[];
  damages: DamageEvent[];
  bomb: BombTimeline;
}

/** Normalised, parser-independent representation of a whole match. */
export interface ReplayData {
  map: string;
  tickRate: number;
  sampleRateHz: number;
  /** steamId -> display name */
  players: Record<string, string>;
  rounds: ReplayRound[];
}
