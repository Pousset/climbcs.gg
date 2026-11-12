import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { renderWithProviders } from './test/helpers';
import { createRecordingContext } from './test/recording-context';

describe('App routing', () => {
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

  it('serves the landing page at the root', () => {
    renderWithProviders(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Revois chaque round/ }),
    ).toBeInTheDocument();
  });

  it('serves the login page', () => {
    renderWithProviders(<App />, { route: '/connexion' });
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });

  it('serves the registration page', () => {
    renderWithProviders(<App />, { route: '/inscription' });
    expect(screen.getByRole('heading', { name: 'Créer un compte' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown routes', () => {
    renderWithProviders(<App />, { route: '/nope' });
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('protects the dashboard behind authentication', () => {
    renderWithProviders(<App />, { route: '/tableau-de-bord' });
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });

  it('serves the dashboard to authenticated users', async () => {
    renderWithProviders(<App />, { route: '/tableau-de-bord', token: 'tok' });
    expect(await screen.findByRole('heading', { name: 'Mes démos' })).toBeInTheDocument();
  });

  it('exposes a skip link and the main landmark', () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveAttribute(
      'href',
      '#contenu',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenu');
  });
});
