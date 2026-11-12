import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import type { PublicDemo } from '../lib/types';
import { alice, createFakeClient, renderWithProviders } from '../test/helpers';
import { DashboardPage } from './DashboardPage';

const demo = (over: Partial<PublicDemo> = {}): PublicDemo => ({
  id: 'd1',
  originalName: 'match.dem',
  sizeBytes: 1024,
  status: 'ready',
  map: 'de_mirage',
  roundCount: 24,
  errorCode: null,
  createdAt: '2026-11-13T10:00:00.000Z',
  ...over,
});
const closedQuota = {
  plan: 'free' as const,
  limit: 1,
  used: 1,
  remaining: 0,
  allowed: false,
  resetsAt: '2099-01-01T00:00:00.000Z',
};

const renderDashboard = (client = createFakeClient()) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<DashboardPage />} />
    </Routes>,
    { client, token: 'tok' },
  );

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DashboardPage', () => {
  it('loads the quota and the demos', async () => {
    renderDashboard(createFakeClient({ listDemos: vi.fn(async () => [demo()]) }));
    expect(await screen.findByText('match.dem')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toBeDefined();
    expect(screen.getByText('Ta démo gratuite du jour est disponible.')).toBeInTheDocument();
  });

  it('shows an empty state for a new account', async () => {
    renderDashboard();
    expect(await screen.findByText(/Aucune démo pour l’instant/)).toBeInTheDocument();
  });

  it('uploads a demo and refreshes the list', async () => {
    const listDemos = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue([demo({ status: 'processing' })]);
    const client = createFakeClient({
      listDemos,
      uploadDemo: vi.fn(async () => demo({ status: 'processing' })),
    });
    renderDashboard(client);
    await screen.findByText(/Aucune démo/);
    const file = new File(['PBDEMS2'], 'match.dem');
    await userEvent.upload(screen.getByLabelText('Démo CS2 (.dem)'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(client.uploadDemo).toHaveBeenCalledWith(file);
    expect(await screen.findByText('Analyse en cours…')).toBeInTheDocument();
  });

  it('blocks uploads and says when the quota resets once the daily demo is used', async () => {
    renderDashboard(createFakeClient({ quota: vi.fn(async () => closedQuota) }));
    expect(await screen.findByText(/Démo gratuite du jour utilisée/)).toBeInTheDocument();
    expect(screen.getByLabelText('Démo CS2 (.dem)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analyser la démo' })).toBeDisabled();
  });

  it('shows the API error when the upload is refused', async () => {
    const client = createFakeClient({
      uploadDemo: vi.fn(async () => Promise.reject(new ApiError(400, 'INVALID_HEADER', 'x'))),
    });
    renderDashboard(client);
    await screen.findByText(/Aucune démo/);
    await userEvent.upload(
      screen.getByLabelText('Démo CS2 (.dem)'),
      new File(['nope'], 'fake.dem'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(
      await screen.findByText('Ce fichier n’est pas une démo CS2 valide.'),
    ).toBeInTheDocument();
  });

  it('polls while a demo is being analysed and stops when it is ready', async () => {
    vi.useFakeTimers();
    const listDemos = vi
      .fn()
      .mockResolvedValueOnce([demo({ status: 'processing' })])
      .mockResolvedValue([demo({ status: 'ready' })]);
    renderDashboard(createFakeClient({ listDemos }));
    await act(async () => {});
    expect(screen.getByText('Analyse en cours…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByRole('link', { name: 'Ouvrir le replay' })).toBeInTheDocument();
    const calls = listDemos.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(listDemos.mock.calls.length).toBe(calls);
  });

  it('deletes a demo after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const listDemos = vi.fn().mockResolvedValueOnce([demo()]).mockResolvedValue([]);
    const client = createFakeClient({ listDemos });
    renderDashboard(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer match.dem' }));
    expect(client.deleteDemo).toHaveBeenCalledWith('d1');
    expect(await screen.findByText(/Aucune démo/)).toBeInTheDocument();
  });

  it('keeps the demo when the deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const client = createFakeClient({ listDemos: vi.fn(async () => [demo()]) });
    renderDashboard(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer match.dem' }));
    expect(client.deleteDemo).not.toHaveBeenCalled();
  });

  it('offers the simulated Premium upgrade to free accounts and reloads the quota', async () => {
    const client = createFakeClient({
      me: vi.fn(async () => alice),
      quota: vi.fn().mockResolvedValueOnce(closedQuota).mockResolvedValue({
        plan: 'premium',
        limit: null,
        used: 1,
        remaining: null,
        allowed: true,
        resetsAt: '2099-01-01T00:00:00.000Z',
      }),
    });
    renderDashboard(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Passer en Premium (démo)' }));
    expect(client.setPlan).toHaveBeenCalledWith('premium');
    await waitFor(() =>
      expect(screen.getByText('Premium : analyses illimitées.')).toBeInTheDocument(),
    );
  });

  it('shows a load error', async () => {
    renderDashboard(
      createFakeClient({
        listDemos: vi.fn(async () => Promise.reject(new ApiError(0, 'NETWORK', 'x'))),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('joindre le serveur');
  });
});
