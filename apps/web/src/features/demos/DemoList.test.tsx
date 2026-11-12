import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { PublicDemo } from '../../lib/types';
import { DemoList } from './DemoList';

const demo = (over: Partial<PublicDemo> = {}): PublicDemo => ({
  id: 'd1',
  originalName: 'match.dem',
  sizeBytes: 150 * 1024 * 1024,
  status: 'ready',
  map: 'de_mirage',
  roundCount: 24,
  errorCode: null,
  createdAt: '2026-11-13T10:00:00.000Z',
  ...over,
});
const renderList = (demos: PublicDemo[], onDelete = vi.fn()) =>
  render(
    <MemoryRouter>
      <DemoList demos={demos} onDelete={onDelete} />
    </MemoryRouter>,
  );

describe('DemoList', () => {
  it('shows an empty state', () => {
    renderList([]);
    expect(screen.getByText(/Aucune démo/)).toBeInTheDocument();
  });

  it('links a ready demo to its replay and shows its metadata', () => {
    renderList([demo()]);
    expect(screen.getByRole('link', { name: 'Ouvrir le replay' })).toHaveAttribute(
      'href',
      '/demos/d1',
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('150 Mo');
    expect(item).toHaveTextContent('de_mirage');
    expect(item).toHaveTextContent('24 rounds');
  });

  it('shows progress for a demo being analysed, without a replay link', () => {
    renderList([demo({ status: 'processing', map: null, roundCount: null })]);
    expect(screen.getByRole('status')).toHaveTextContent('Analyse en cours');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('explains why an analysis failed', () => {
    renderList([demo({ status: 'failed', errorCode: 'NO_ROUNDS' })]);
    expect(screen.getByText(/Aucun round complet/)).toBeInTheDocument();
  });

  it('asks the parent to delete the chosen demo', async () => {
    const onDelete = vi.fn();
    const target = demo({ id: 'd2', originalName: 'second.dem' });
    renderList([demo(), target], onDelete);
    const item = screen.getAllByRole('listitem')[1]!;
    await userEvent.click(within(item).getByRole('button', { name: 'Supprimer second.dem' }));
    expect(onDelete).toHaveBeenCalledWith(target);
  });
});
