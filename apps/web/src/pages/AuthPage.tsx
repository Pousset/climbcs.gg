import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import { validateCredentials } from '../lib/validation';
import type { CredentialErrors, CredentialMode } from '../lib/validation';
import './auth.css';

const COPY: Record<
  CredentialMode,
  { title: string; submit: string; switchText: string; switchLink: string; switchTo: string }
> = {
  login: {
    title: 'Connexion',
    submit: 'Se connecter',
    switchText: 'Pas encore de compte ?',
    switchLink: 'Créer un compte',
    switchTo: '/inscription',
  },
  register: {
    title: 'Créer un compte',
    submit: 'Créer mon compte',
    switchText: 'Déjà inscrit ?',
    switchLink: 'Se connecter',
    switchTo: '/connexion',
  },
};

export function AuthPage({ mode }: { mode: CredentialMode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];
  const destination = (location.state as { from?: string } | null)?.from ?? '/tableau-de-bord';

  if (auth.status === 'authenticated') return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = validateCredentials(username, password, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    try {
      await (mode === 'login' ? auth.login : auth.register)(username.trim(), password);
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container page auth">
      <h1>{copy.title}</h1>
      <form onSubmit={handleSubmit} noValidate className="auth__form">
        <div className="field">
          <label htmlFor="username">Nom d’utilisateur</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={errors.username ? true : undefined}
            aria-describedby={errors.username ? 'username-error' : undefined}
          />
          {errors.username && (
            <span id="username-error" className="field__error">
              {errors.username}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <span id="password-error" className="field__error">
              {errors.password}
            </span>
          )}
        </div>
        {formError && (
          <p role="alert" className="form-error">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Veuillez patienter…' : copy.submit}
        </button>
      </form>
      <p className="muted">
        {copy.switchText} <Link to={copy.switchTo}>{copy.switchLink}</Link>
      </p>
    </div>
  );
}
