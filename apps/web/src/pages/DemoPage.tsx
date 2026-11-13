import type { GatedReport } from '@cs2/core';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ScoreboardTable } from '../features/demos/ScoreboardTable';
import { useDemoData } from '../features/demos/useDemoData';
import { ReplayPlayer } from '../features/replay/ReplayPlayer';
import { ReportPanel } from '../features/report/ReportPanel';
import { useAuth } from '../lib/auth';
import { describeDemoFailure, describeError } from '../lib/errors';
import { useUpgrade } from '../lib/useUpgrade';
import './demo.css';

export function DemoPage() {
  const { demoId } = useParams();
  const data = useDemoData(demoId);

  return (
    <div className="container page demo">
      <p>
        <Link to="/tableau-de-bord">← Mes démos</Link>
      </p>
      {data.status === 'loading' && <p role="status">Chargement…</p>}
      {data.status === 'processing' && (
        <p role="status">
          Analyse de « {data.demo.originalName} » en cours… Cela peut prendre une minute.
        </p>
      )}
      {data.status === 'failed' && (
        <>
          <h1>{data.demo.originalName}</h1>
          <p role="alert" className="form-error">
            {describeDemoFailure(data.demo.errorCode)}
          </p>
        </>
      )}
      {data.status === 'error' && (
        <p role="alert" className="form-error">
          {data.message}
        </p>
      )}
      {data.status === 'ready' && demoId && (
        <ReadyDemo
          demoId={demoId}
          title={data.demo.originalName}
          meta={`${data.demo.map ?? 'Carte inconnue'} · ${data.demo.roundCount ?? 0} rounds`}
          data={data}
        />
      )}
    </div>
  );
}

function ReadyDemo({
  demoId,
  title,
  meta,
  data,
}: {
  demoId: string;
  title: string;
  meta: string;
  data: Extract<ReturnType<typeof useDemoData>, { status: 'ready' }>;
}) {
  const { client, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<GatedReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const { upgrade, pending: upgrading, error: upgradeError } = useUpgrade();
  const plan = user?.plan;

  const loadReport = useCallback(
    async (playerId: string) => {
      try {
        setReport(await client.getReport(demoId, playerId));
        setReportError(null);
      } catch (error) {
        setReport(null);
        setReportError(describeError(error));
      }
    },
    [client, demoId],
  );

  // (Re)load the report when the player changes or the plan changes (premium unlocks more).
  useEffect(() => {
    if (selectedId) void loadReport(selectedId);
  }, [selectedId, plan, loadReport]);

  return (
    <>
      <h1>{title}</h1>
      <p className="muted">{meta}</p>
      <ReplayPlayer replay={data.replay} highlightId={selectedId} />

      <section className="demo__section" aria-labelledby="joueurs">
        <h2 id="joueurs">Scoreboard</h2>
        <p className="muted">Choisis ton joueur pour obtenir ton rapport.</p>
        <ScoreboardTable rows={data.scoreboard} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      <section className="demo__section" aria-labelledby="rapport-joueur">
        <h2 id="rapport-joueur">Rapport</h2>
        {!selectedId && <p className="muted">Aucun joueur sélectionné.</p>}
        {reportError && (
          <p role="alert" className="form-error">
            {reportError}
          </p>
        )}
        {report && (
          <ReportPanel report={report} onUpgrade={upgrading ? undefined : () => void upgrade()} />
        )}
        {upgradeError && (
          <p role="alert" className="form-error">
            {upgradeError}
          </p>
        )}
      </section>
    </>
  );
}
