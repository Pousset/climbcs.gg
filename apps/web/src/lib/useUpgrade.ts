import { useCallback, useState } from 'react';
import { ApiError } from './api';
import { useAuth } from './auth';

/**
 * Simulated "go Premium" action of the V1 product demo. It calls the API's dev plan switch;
 * in V2 this becomes a Stripe checkout.
 */
export function useUpgrade() {
  const { client, refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = useCallback(async (): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await client.setPlan('premium');
      await refresh();
      return true;
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? 'L’abonnement Premium sera bientôt disponible.'
          : 'Impossible de passer en Premium pour le moment.',
      );
      return false;
    } finally {
      setPending(false);
    }
  }, [client, refresh]);

  return { upgrade, pending, error };
}
