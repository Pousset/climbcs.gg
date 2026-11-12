import { buildReport, gateReport, generateSampleReplay, SAMPLE_PLAYER_ID } from '@cs2/core';
import type { GatedReport, PlayerReport } from '@cs2/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LockedSection } from './LockedSection';
import { ReportPanel } from './ReportPanel';

const base = buildReport(generateSampleReplay(), SAMPLE_PLAYER_ID);
const report: PlayerReport = {
  ...base,
  rating: 1.23,
  stats: { ...base.stats, kast: 0.74 },
  tips: [
    { id: 'LOW_KAST', severity: 'high', metrics: { kast: 0.45 } },
    { id: 'LOW_DAMAGE', severity: 'medium', metrics: { adr: 50 } },
    { id: 'LOW_HEADSHOT', severity: 'low', metrics: { hsPercent: 12 } },
  ],
};
const free: GatedReport = gateReport(report, 'free');
const premium: GatedReport = gateReport(report, 'premium');

describe('LockedSection', () => {
  it('describes the locked feature and hides the decorative preview from assistive tech', () => {
    const { container } = render(<LockedSection title="Heatmaps" description="Où tu meurs." />);
    expect(screen.getByRole('region', { name: 'Heatmaps (verrouillé)' })).toBeInTheDocument();
    expect(container.querySelector('.locked__preview')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onUpgrade from the call-to-action', async () => {
    const onUpgrade = vi.fn();
    render(<LockedSection title="T" description="D" onUpgrade={onUpgrade} />);
    await userEvent.click(screen.getByRole('button', { name: 'Débloquer avec Premium' }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
});

describe('ReportPanel (free plan)', () => {
  it('shows the basic statistics and the rating band only', () => {
    render(<ReportPanel report={free} />);
    const panel = screen.getByRole('article', { name: 'Rapport de Aegis' });
    expect(within(panel).getByText('Gratuit')).toBeInTheDocument();
    expect(within(panel).getByText('K / D / A')).toBeInTheDocument();
    expect(within(panel).getByText('Au-dessus de la moyenne')).toBeInTheDocument();
    expect(within(panel).getByText('Note exacte avec Premium')).toBeInTheDocument();
    expect(panel).not.toHaveTextContent('1,23');
    expect(within(panel).queryByText('KAST')).not.toBeInTheDocument();
  });

  it('shows only the top tip and teases the others', () => {
    render(<ReportPanel report={free} />);
    expect(screen.getByText('Tu joues trop isolé')).toBeInTheDocument();
    expect(screen.getByText('Priorité haute')).toBeInTheDocument();
    expect(screen.queryByText('Pas assez d’impact')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: '2 conseils de plus (verrouillé)' }),
    ).toBeInTheDocument();
  });

  it('teases KAST, heatmaps and utility analysis', () => {
    render(<ReportPanel report={free} />);
    expect(
      screen.getByRole('region', { name: 'KAST et note détaillée (verrouillé)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Heatmaps de positionnement (verrouillé)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Analyse des utilitaires (verrouillé)' }),
    ).toBeInTheDocument();
  });

  it('wires every upgrade button to onUpgrade only when provided', async () => {
    const onUpgrade = vi.fn();
    const { rerender } = render(<ReportPanel report={free} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ReportPanel report={free} onUpgrade={onUpgrade} />);
    const buttons = screen.getAllByRole('button', { name: 'Débloquer avec Premium' });
    expect(buttons.length).toBe(4);
    await userEvent.click(buttons[0]!);
    expect(onUpgrade).toHaveBeenCalled();
  });

  it('says so when there is no advice at all', () => {
    render(<ReportPanel report={gateReport({ ...report, tips: [] }, 'free')} />);
    expect(screen.getByText(/Pas assez de données/)).toBeInTheDocument();
  });
});

describe('ReportPanel (premium plan)', () => {
  it('reveals the exact rating and KAST', () => {
    render(<ReportPanel report={premium} />);
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('1,23')).toBeInTheDocument();
    expect(screen.getByText('74 %')).toBeInTheDocument();
  });

  it('lists every tip with its severity and personalised wording', () => {
    render(<ReportPanel report={premium} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/45 % des rounds/)).toBeInTheDocument();
    expect(screen.getByText('Détail')).toBeInTheDocument();
  });

  it('shows no locked section', () => {
    render(<ReportPanel report={premium} />);
    expect(screen.queryByText(/verrouillé/)).not.toBeInTheDocument();
  });
});
