import { ApiError } from './api';

/** User-facing French message for any error thrown by the API client. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Une erreur inattendue est survenue.';
  switch (error.code) {
    case 'NETWORK':
      return 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.';
    case 'DAILY_QUOTA_EXCEEDED':
      return 'Tu as déjà analysé ta démo gratuite du jour. Reviens demain ou passe Premium.';
    case 'INVALID_EXTENSION':
      return 'Le fichier doit être une démo CS2 au format .dem.';
    case 'INVALID_HEADER':
      return 'Ce fichier n’est pas une démo CS2 valide.';
    case 'LEGACY_CSGO_DEMO':
      return 'Les démos CS:GO ne sont pas prises en charge : envoie une démo CS2.';
    case 'EMPTY_FILE':
      return 'Le fichier est vide.';
    case 'FILE_TOO_LARGE':
      return 'Le fichier dépasse la taille maximale autorisée.';
    case 'FILE_REQUIRED':
      return 'Choisis un fichier .dem à envoyer.';
    case 'DEMO_NOT_READY':
      return 'L’analyse de cette démo n’est pas terminée.';
    default:
  }
  switch (error.status) {
    case 401:
      return 'Identifiants incorrects.';
    case 409:
      return 'Ce nom d’utilisateur est déjà pris.';
    case 413:
      return 'Le fichier dépasse la taille maximale autorisée.';
    case 404:
      return 'Élément introuvable.';
    default:
      return error.status >= 500
        ? 'Le serveur a rencontré un problème. Réessaie dans un instant.'
        : 'La requête a été refusée.';
  }
}

/** Reason why a demo failed to analyse, shown in the demo list. */
export function describeDemoFailure(errorCode: string | null): string {
  return errorCode === 'NO_ROUNDS'
    ? 'Aucun round complet trouvé dans cette démo.'
    : 'L’analyse a échoué. Vérifie que le fichier est une démo CS2 complète.';
}
