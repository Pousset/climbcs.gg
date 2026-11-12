import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRecordingContext } from '../test/recording-context';
import { renderWithProviders } from '../test/helpers';
import { LandingPage, OWNER_GITHUB_URL } from './LandingPage';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => createRecordingContext().ctx as unknown as RenderingContext,
  );
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LandingPage', () => {
  it('states the value proposition and leads to registration', () => {
    renderWithProviders(<LandingPage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Revois chaque round. Comprends tes erreurs.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Analyser ma première démo' })).toHaveAttribute(
      'href',
      '/inscription',
    );
    expect(screen.getByRole('link', { name: 'J’ai déjà un compte' })).toHaveAttribute(
      'href',
      '/connexion',
    );
  });

  it('embeds a playable sample replay', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('region', { name: 'Replay 2D' })).toBeInTheDocument();
    expect(screen.getByText('Match d’exemple sur une carte fictive.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument(); // autoplay
  });

  it('does not autoplay when the visitor prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('button', { name: 'Lecture' })).toBeInTheDocument();
  });

  it('previews a report with locked premium sections', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('article', { name: 'Rapport de Aegis' })).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: /verrouillé/ }).length).toBeGreaterThan(0);
  });

  it('compares the free and premium plans in an accessible table', () => {
    renderWithProviders(<LandingPage />);
    const table = screen.getByRole('table', { name: 'Comparaison des offres Gratuit et Premium' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(7);
    const quota = within(screen.getByRole('row', { name: /Démos analysées par jour/ }));
    expect(quota.getByText('1')).toBeInTheDocument();
    expect(quota.getByText('Illimité')).toBeInTheDocument();
  });

  it('presents the engineering approach with an external link', () => {
    renderWithProviders(<LandingPage />);
    expect(
      screen.getByRole('heading', { name: /construit comme un vrai produit/ }),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Voir mon GitHub' });
    expect(link).toHaveAttribute('href', OWNER_GITHUB_URL);
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
