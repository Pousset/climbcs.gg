import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { renderWithProviders } from './test/helpers';

describe('App routing', () => {
  it('redirects the root to the login page for anonymous visitors', () => {
    renderWithProviders(<App />);
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

  it('exposes a skip link and the main landmark', () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveAttribute(
      'href',
      '#contenu',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenu');
  });
});
