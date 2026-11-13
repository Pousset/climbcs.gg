import {
  buildReport,
  computeScoreboard,
  gateReport,
  generateSampleReplay,
  SAMPLE_PLAYER_ID,
} from '@cs2/core';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import type { PublicDemo, ScoreboardRow } from '../lib/types';
import { createFakeClient, renderWithProviders } from '../test/helpers';
import { createRecordingContext } from '../test/recording-context';
import { DemoPage } from './DemoPage';

const replay = generateSampleReplay();
const scoreboard: ScoreboardRow[] = computeScoreboard(replay).map((p) => ({
  id: p.id,
  name: p.name,
  team: p.id.includes('-ct-') ? 'CT' : 'T',
  rounds: p.rounds,
  kills: p.kills,
  deaths: p.deaths,
  assists: p.assists,
  kd: p.kd,
  adr: p.adr,
  hsPercent: p.hsPercent,
}));
const readyDemo: PublicDemo = {
  id: 'd1',
  originalName: 'final.dem',
  sizeBytes: 10,
  status: 'ready',
  map: 'sample_arena',
  roundCount: 3,
  errorCode: null,
  createdAt: '2026-11-13T10:00:00.000Z',
};
const freeReport = () => gateReport(buildReport(replay, SAMPLE_PLAYER_ID), 'free');
const premiumReport = () => gateReport(buildReport(replay, SAMPLE_PLAYER_ID), 'premium');

const readyClient = (over: Parameters<typeof createFakeClient>[0] = {}) =>
  createFakeClient({
    getDemo: vi.fn(async () => readyDemo),
    getReplay: vi.fn(async () => replay),
    getScoreboard: vi.fn(async () => scoreboard),
    getReport: vi.fn(async () => freeReport()),
    ...over,
  });

const renderDemo = (client = readyClient()) =>
  renderWithProviders(
    <Routes>
      <Route path="/demos/:demoId" element={<DemoPage />} />
    </Routes>,
    { client, token: 'tok', route: '/demos/d1' },
  );

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => createRecordingContext().ctx as unknown as RenderingContext,
  );
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DemoPage', () => {
  it('shows the replay and the scoreboard of a ready demo', async () => {
    renderDemo();
    expect(await screen.findByRole('heading', { name: 'final.dem' })).toBeInTheDocument();
    expect(screen.getByText('sample_arena · 3 rounds')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Replay 2D' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Aucun joueur sélectionné.')).toBeInTheDocument();
  });

  it('loads the gated report when a player is chosen', async () => {
    const client = readyClient();
    renderDemo(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Aegis' }));
    expect(client.getReport).toHaveBeenCalledWith('d1', SAMPLE_PLAYER_ID);
    expect(await screen.findByRole('article', { name: 'Rapport de Aegis' })).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: /verrouillé/ }).length).toBeGreaterThan(0);
  });

  it('unlocks the report after the simulated upgrade', async () => {
    const getReport = vi
      .fn()
      .mockResolvedValueOnce(freeReport())
      .mockResolvedValue(premiumReport());
    const client = readyClient({
      getReport,
      me: vi
        .fn()
        .mockResolvedValueOnce({ id: 'u1', username: 'Alice', plan: 'free', createdAt: '' })
        .mockResolvedValue({ id: 'u1', username: 'Alice', plan: 'premium', createdAt: '' }),
    });
    renderDemo(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Aegis' }));
    const unlock = (await screen.findAllByRole('button', { name: 'Débloquer avec Premium' }))[0]!;
    await userEvent.click(unlock);
    expect(client.setPlan).toHaveBeenCalledWith('premium');
    expect(await screen.findByText('Premium')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /verrouillé/ })).not.toBeInTheDocument();
  });

  it('shows an error when the report cannot be loaded', async () => {
    const client = readyClient({
      getReport: vi.fn(async () => Promise.reject(new ApiError(404, null, 'x'))),
    });
    renderDemo(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Aegis' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Élément introuvable.');
  });

  it('waits for an analysis in progress, then shows the replay', async () => {
    vi.useFakeTimers();
    const getDemo = vi
      .fn()
      .mockResolvedValueOnce({ ...readyDemo, status: 'processing', map: null, roundCount: null })
      .mockResolvedValue(readyDemo);
    renderDemo(readyClient({ getDemo }));
    await act(async () => {});
    expect(screen.getByRole('status')).toHaveTextContent('Analyse de « final.dem » en cours');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByRole('region', { name: 'Replay 2D' })).toBeInTheDocument();
  });

  it('explains a failed analysis', async () => {
    renderDemo(
      readyClient({
        getDemo: vi.fn(async () => ({ ...readyDemo, status: 'failed', errorCode: 'NO_ROUNDS' })),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun round complet');
  });

  it('shows an error for an unknown demo and links back to the dashboard', async () => {
    renderDemo(
      readyClient({ getDemo: vi.fn(async () => Promise.reject(new ApiError(404, null, 'nf'))) }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Élément introuvable.');
    expect(screen.getByRole('link', { name: '← Mes démos' })).toHaveAttribute(
      'href',
      '/tableau-de-bord',
    );
  });
});
