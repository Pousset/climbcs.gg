export type CredentialMode = 'login' | 'register';

export interface CredentialErrors {
  username?: string;
  password?: string;
}

/** Client-side mirror of the API rules, to give instant feedback (the API stays the authority). */
export function validateCredentials(
  username: string,
  password: string,
  mode: CredentialMode,
): CredentialErrors {
  const errors: CredentialErrors = {};
  const name = username.trim();
  if (mode === 'login') {
    if (!name) errors.username = 'Entre ton nom d’utilisateur.';
    if (!password) errors.password = 'Entre ton mot de passe.';
    return errors;
  }
  if (name.length < 3 || name.length > 20) {
    errors.username = 'Le nom d’utilisateur doit contenir entre 3 et 20 caractères.';
  } else if (!/^[A-Za-z0-9_]+$/.test(name)) {
    errors.username = 'Uniquement des lettres, chiffres et underscores.';
  }
  if (password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
  else if (password.length > 72) errors.password = 'Le mot de passe est limité à 72 caractères.';
  return errors;
}
