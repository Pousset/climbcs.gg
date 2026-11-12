import { generateSampleReplay } from '@cs2/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRecordingContext } from '../../test/recording-context';
import { ReplayPlayer } from './ReplayPlayer';

const replay = generateSampleReplay();
let recording: ReturnType<typeof createRecordingContext>;

beforeEach(() => {
  recording = createRecordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => recording.ctx as unknown as RenderingContext,
  );
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const seek = (seconds: number) =>
  fireEvent.change(screen.getByLabelText('Position dans le round'), {
    target: { value: String(seconds) },
  });

describe('ReplayPlayer', () => {
  it('shows a message when there is nothing to replay', () => {
    render(<ReplayPlayer replay={{ ...replay, rounds: [] }} />);
    expect(screen.getByText('Aucun round à afficher.')).toBeInTheDocument();
  });

  it('lists every round with its winner and selects the first one', () => {
    render(<ReplayPlayer replay={replay} />);
    const rounds = within(screen.getByRole('group', { name: 'Rounds' })).getAllByRole('button');
    expect(rounds).toHaveLength(3);
    expect(rounds[0]).toHaveAttribute('aria-pressed', 'true');
    expect(rounds[1]).toHaveAttribute('aria-pressed', 'false');
    expect(rounds[1]).toHaveTextContent('Round 2');
    expect(rounds[1]).toHaveTextContent('T');
  });

  it('exposes the board as an accessible image with live counts', () => {
    render(<ReplayPlayer replay={replay} />);
    expect(screen.getByRole('img', { name: /round 1, 5 CT et 5 T en vie/i })).toBeInTheDocument();
  });

  it('draws one disc per living player on the canvas', () => {
    render(<ReplayPlayer replay={replay} />);
    const discs = recording.named('arc').filter((c) => c.args[2] === 7);
    expect(discs).toHaveLength(10);
  });

  it('updates the clock, counts and kill feed when seeking', () => {
    render(<ReplayPlayer replay={replay} />);
    expect(screen.getByLabelText('Temps écoulé')).toHaveTextContent('0:00 / 0:45');
    seek(7);
    expect(screen.getByLabelText('Temps écoulé')).toHaveTextContent('0:07 / 0:45');
    const feed = screen.getByRole('list', { name: 'Éliminations' });
    expect(within(feed).getByText(/Aegis ▸ Vex/)).toHaveTextContent('tête');
    expect(screen.getByRole('img')).toHaveAccessibleName(/5 CT et 4 T en vie/);
  });

  it('switches to another round and restarts at zero', async () => {
    const user = userEvent.setup();
    render(<ReplayPlayer replay={replay} />);
    seek(20);
    await user.click(screen.getByRole('button', { name: /Round 2/ }));
    expect(screen.getByLabelText('Temps écoulé')).toHaveTextContent('0:00 / 0:45');
    expect(screen.getByRole('button', { name: /Round 2/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img')).toHaveAccessibleName(/round 2/i);
  });

  it('toggles the play button label', async () => {
    const user = userEvent.setup();
    render(<ReplayPlayer replay={replay} />);
    const button = screen.getByRole('button', { name: 'Lecture' });
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Lecture' })).toBeInTheDocument();
  });

  it('offers playback speeds', async () => {
    const user = userEvent.setup();
    render(<ReplayPlayer replay={replay} />);
    const select = screen.getByRole('combobox', { name: 'Vitesse de lecture' });
    await user.selectOptions(select, '4');
    expect(select).toHaveValue('4');
  });

  it('rings the highlighted player on the board', () => {
    render(<ReplayPlayer replay={replay} highlightId="sample-ct-1" />);
    expect(recording.named('arc').filter((c) => c.args[2] === 11)).toHaveLength(1);
  });

  it('starts playing automatically when requested', () => {
    render(<ReplayPlayer replay={replay} autoPlay />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });
});
