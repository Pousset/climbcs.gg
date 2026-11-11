import type { Plan } from '@cs2/core';

/** Shapes returned by the REST API (kept in sync with apps/api). */
export interface PublicUser {
  id: string;
  username: string;
  plan: Plan;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export type DemoStatus = 'processing' | 'ready' | 'failed';

export interface PublicDemo {
  id: string;
  originalName: string;
  sizeBytes: number;
  status: DemoStatus;
  map: string | null;
  roundCount: number | null;
  errorCode: string | null;
  createdAt: string;
}

export interface ScoreboardRow {
  id: string;
  name: string;
  team: 'T' | 'CT' | null;
  rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  adr: number;
  hsPercent: number;
}
