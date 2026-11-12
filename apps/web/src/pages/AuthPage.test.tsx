import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { createFakeClient, renderWithProviders } from '../test/helpers';
import { AuthPage } from './AuthPage';

const routes = (mode: 'login' | 'register') => (
  <Routes>
    <Route path="/" element={<AuthPage mode={mode} />} />
    <Route path="/tableau-de-bord" element={<p>tableau de bord</p>} />
  </Routes>
);

const fill = async (username: string, password: string) => {
  const user = userEvent.setup();
  if (username) await user.type(screen.getByLabelText('Nom d’utilisateur'), username);
  if (password) await user.type(screen.getByLabelText('Mot de passe'), password);
  return user;
};

describe('AuthPage (login)', () => {
  it('shows validation errors without calling the API', async () => {
    const { client } = renderWithProviders(routes('login'));
    const user = await fill('', '');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByText('Entre ton nom d’utilisateur.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom d’utilisateur')).toHaveAttribute('aria-invalid', 'true');
    expect(client.login).not.toHaveBeenCalled();
  });

  it('logs in and goes to the dashboard', async () => {
    const { client } = renderWithProviders(routes('login'));
    const user = await fill('Alice', 'secret-pw');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('tableau de bord')).toBeInTheDocument();
    expect(client.login).toHaveBeenCalledWith('Alice', 'secret-pw');
  });

  it('shows a readable message for wrong credentials', async () => {
    const client = createFakeClient({
      login: vi.fn(async () => Promise.reject(new ApiError(401, null, 'Invalid credentials'))),
    });
    renderWithProviders(routes('login'), { client });
    const user = await fill('Alice', 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants incorrects.');
  });

  it('disables the button while the request is pending', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const client = createFakeClient({
      login: vi.fn(() => new Promise((resolve) => (finish = resolve))),
    });
    renderWithProviders(routes('login'), { client });
    const user = await fill('Alice', 'secret-pw');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByRole('button', { name: 'Veuillez patienter…' })).toBeDisabled();
    finish({ accessToken: 't', user: { id: '1', username: 'Alice', plan: 'free', createdAt: '' } });
    await waitFor(() => expect(screen.getByText('tableau de bord')).toBeInTheDocument());
  });

  it('links to the registration page', () => {
    renderWithProviders(routes('login'));
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/inscription',
    );
  });

  it('redirects already authenticated users', async () => {
    renderWithProviders(routes('login'), { token: 'stored' });
    expect(await screen.findByText('tableau de bord')).toBeInTheDocument();
  });
});

describe('AuthPage (register)', () => {
  it('validates the username and password rules', async () => {
    const { client } = renderWithProviders(routes('register'));
    const user = await fill('a b', 'short');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText(/entre 3 et 20|underscores/)).toBeInTheDocument();
    expect(screen.getByText(/au moins 8 caractères/)).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it('creates the account with the trimmed username', async () => {
    const { client } = renderWithProviders(routes('register'));
    const user = await fill('  Newbie  ', 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(await screen.findByText('tableau de bord')).toBeInTheDocument();
    expect(client.register).toHaveBeenCalledWith('Newbie', 'long-enough-pw');
  });

  it('reports a taken username', async () => {
    const client = createFakeClient({
      register: vi.fn(async () =>
        Promise.reject(new ApiError(409, null, 'Username already taken')),
      ),
    });
    renderWithProviders(routes('register'), { client });
    const user = await fill('Taken', 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('déjà pris');
  });
});
