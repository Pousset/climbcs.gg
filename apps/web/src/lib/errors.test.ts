import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { describeDemoFailure, describeError } from './errors';

const api = (status: number, code: string | null = null) => new ApiError(status, code, 'raw');

describe('describeError', () => {
  it('maps API codes to specific messages', () => {
    expect(describeError(api(0, 'NETWORK'))).toMatch(/joindre le serveur/);
    expect(describeError(api(403, 'DAILY_QUOTA_EXCEEDED'))).toMatch(/démo gratuite du jour/);
    expect(describeError(api(400, 'INVALID_HEADER'))).toMatch(/pas une démo CS2 valide/);
    expect(describeError(api(400, 'LEGACY_CSGO_DEMO'))).toMatch(/CS:GO/);
    expect(describeError(api(400, 'INVALID_EXTENSION'))).toMatch(/\.dem/);
    expect(describeError(api(400, 'FILE_TOO_LARGE'))).toMatch(/taille maximale/);
    expect(describeError(api(400, 'FILE_REQUIRED'))).toMatch(/Choisis un fichier/);
  });

  it('falls back to the HTTP status', () => {
    expect(describeError(api(401))).toBe('Identifiants incorrects.');
    expect(describeError(api(409))).toBe('Ce nom d’utilisateur est déjà pris.');
    expect(describeError(api(413))).toMatch(/taille maximale/);
    expect(describeError(api(404))).toBe('Élément introuvable.');
    expect(describeError(api(503))).toMatch(/serveur a rencontré/);
    expect(describeError(api(400))).toBe('La requête a été refusée.');
  });

  it('handles unknown errors', () => {
    expect(describeError(new Error('boom'))).toBe('Une erreur inattendue est survenue.');
    expect(describeError('nope')).toBe('Une erreur inattendue est survenue.');
  });
});

describe('describeDemoFailure', () => {
  it('distinguishes demos without rounds from other failures', () => {
    expect(describeDemoFailure('NO_ROUNDS')).toMatch(/Aucun round/);
    expect(describeDemoFailure('PARSE_FAILED')).toMatch(/échoué/);
    expect(describeDemoFailure(null)).toMatch(/échoué/);
  });
});
