import type { QuotaStatus } from '@cs2/core';
import { useCallback, useEffect, useState } from 'react';
import { DemoList } from '../features/demos/DemoList';
import { QuotaStatusView } from '../features/demos/QuotaStatusView';
import { UploadForm } from '../features/demos/UploadForm';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import type { PublicDemo } from '../lib/types';
import { useUpgrade } from '../lib/useUpgrade';
import './dashboard.css';

const POLL_INTERVAL_MS = 2000;

export function DashboardPage() {
  const { client, user } = useAuth();
  const [demos, setDemos] = useState<PublicDemo[] | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { upgrade, pending: upgrading, error: upgradeError } = useUpgrade();

  const load = useCallback(async () => {
    try {
      const [list, status] = await Promise.all([client.listDemos(), client.quota()]);
      setDemos(list);
      setQuota(status);
      setError(null);
    } catch (cause) {
      setError(describeError(cause));
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while an analysis is running so the list flips to "ready" without a manual refresh.
  const hasProcessing = demos?.some((demo) => demo.status === 'processing') ?? false;
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, load]);

  async function handleUpload(file: File) {
    await client.uploadDemo(file);
    await load();
  }

  async function handleDelete(demo: PublicDemo) {
    if (!window.confirm(`Supprimer « ${demo.originalName} » ? Le replay sera effacé.`)) return;
    try {
      await client.deleteDemo(demo.id);
      await load();
    } catch (cause) {
      setError(describeError(cause));
    }
  }

  async function handleUpgrade() {
    if (await upgrade()) await load();
  }

  return (
    <div className="container page dashboard">
      <h1>Mes démos</h1>

      <section className="dashboard__panel" aria-labelledby="envoi">
        <h2 id="envoi">Analyser une démo</h2>
        {quota && <QuotaStatusView quota={quota} />}
        <UploadForm disabled={quota ? !quota.allowed : false} onUpload={handleUpload} />
        {user?.plan === 'free' && (
          <div className="dashboard__upgrade">
            <p>
              Avec Premium : démos illimitées, note détaillée, KAST et tous les conseils
              personnalisés.
            </p>
            <button type="button" className="btn" onClick={handleUpgrade} disabled={upgrading}>
              {upgrading ? 'Activation…' : 'Passer en Premium (démo)'}
            </button>
            {upgradeError && (
              <p role="alert" className="form-error">
                {upgradeError}
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="liste">
        <h2 id="liste">Historique</h2>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {demos === null && !error ? (
          <p role="status">Chargement…</p>
        ) : (
          demos && <DemoList demos={demos} onDelete={handleDelete} />
        )}
      </section>
    </div>
  );
}
