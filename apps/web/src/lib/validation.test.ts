import { describe, expect, it } from 'vitest';
import { validateCredentials } from './validation';

describe('validateCredentials (register)', () => {
  it('accepts valid credentials', () => {
    expect(validateCredentials('Mathis_42', 'long-enough', 'register')).toEqual({});
  });

  it('trims the username before checking its length', () => {
    expect(validateCredentials('  abc  ', 'long-enough', 'register')).toEqual({});
    expect(validateCredentials('  ab  ', 'long-enough', 'register').username).toMatch(
      /entre 3 et 20/,
    );
  });

  it.each(['ab', 'a'.repeat(21)])('rejects a username of the wrong length (%s)', (username) => {
    expect(validateCredentials(username, 'long-enough', 'register').username).toMatch(
      /entre 3 et 20/,
    );
  });

  it.each(['with space', 'émile', 'bad-dash'])('rejects forbidden characters (%s)', (username) => {
    expect(validateCredentials(username, 'long-enough', 'register').username).toMatch(
      /underscores/,
    );
  });

  it('enforces password length bounds', () => {
    expect(validateCredentials('valid', '1234567', 'register').password).toMatch(/au moins 8/);
    expect(validateCredentials('valid', 'x'.repeat(73), 'register').password).toMatch(/72/);
    expect(validateCredentials('valid', 'x'.repeat(72), 'register').password).toBeUndefined();
  });

  it('reports both fields at once', () => {
    expect(Object.keys(validateCredentials('', '', 'register'))).toEqual(['username', 'password']);
  });
});

describe('validateCredentials (login)', () => {
  it('only requires non-empty fields', () => {
    expect(validateCredentials('x', 'y', 'login')).toEqual({});
    expect(validateCredentials('  ', '', 'login')).toEqual({
      username: 'Entre ton nom d’utilisateur.',
      password: 'Entre ton mot de passe.',
    });
  });
});
