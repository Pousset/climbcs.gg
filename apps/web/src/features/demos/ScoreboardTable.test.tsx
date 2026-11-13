import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ScoreboardRow } from '../../lib/types';
import { ScoreboardTable } from './ScoreboardTable';

const rows: ScoreboardRow[] = [
  {
    id: 'a',
    name: 'Alpha',
    team: 'CT',
    rounds: 20,
    kills: 22,
    deaths: 15,
    assists: 4,
    kd: 1.47,
    adr: 88.25,
    hsPercent: 45.4,
  },
  {
    id: 'b',
    name: 'Bravo',
    team: null,
    rounds: 20,
    kills: 10,
    deaths: 18,
    assists: 2,
    kd: 0.56,
    adr: 51,
    hsPercent: 0,
  },
];

describe('ScoreboardTable', () => {
  it('renders one row per player with formatted values', () => {
    render(<ScoreboardTable rows={rows} selectedId={null} onSelect={vi.fn()} />);
    const alpha = within(screen.getByRole('row', { name: /Alpha/ }));
    expect(alpha.getByText('CT')).toBeInTheDocument();
    expect(alpha.getByText('22')).toBeInTheDocument();
    expect(alpha.getByText('88,3')).toBeInTheDocument();
    expect(alpha.getByText('45 %')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Bravo/ })).getByText('—')).toBeInTheDocument();
  });

  it('marks the selected player', () => {
    render(<ScoreboardTable rows={rows} selectedId="b" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bravo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen player', async () => {
    const onSelect = vi.fn();
    render(<ScoreboardTable rows={rows} selectedId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onSelect).toHaveBeenCalledWith('a');
  });
});
