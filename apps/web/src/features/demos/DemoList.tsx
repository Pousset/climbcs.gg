import { Link } from 'react-router-dom';
import { describeDemoFailure } from '../../lib/errors';
import { formatBytes } from '../../lib/format';
import type { PublicDemo } from '../../lib/types';

interface DemoListProps {
  demos: PublicDemo[];
  onDelete: (demo: PublicDemo) => void;
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function DemoList({ demos, onDelete }: DemoListProps) {
  if (demos.length === 0) {
    return <p className="muted">Aucune démo pour l’instant. Envoie ta première démo ci-dessus.</p>;
  }
  return (
    <ul className="demo-list" aria-label="Mes démos">
      {demos.map((demo) => (
        <li key={demo.id} className="demo-list__item">
          <div>
            <strong>{demo.originalName}</strong>
            <p className="muted demo-list__meta">
              {formatBytes(demo.sizeBytes)} · {dateFormat.format(new Date(demo.createdAt))}
              {demo.map ? ` · ${demo.map}` : ''}
              {demo.roundCount ? ` · ${demo.roundCount} rounds` : ''}
            </p>
          </div>
          <div className="demo-list__actions">
            {demo.status === 'processing' && <span role="status">Analyse en cours…</span>}
            {demo.status === 'failed' && <span>Échec : {describeDemoFailure(demo.errorCode)}</span>}
            {demo.status === 'ready' && (
              <Link to={`/demos/${demo.id}`} className="btn btn--primary">
                Ouvrir le replay
              </Link>
            )}
            <button
              type="button"
              className="btn"
              aria-label={`Supprimer ${demo.originalName}`}
              onClick={() => onDelete(demo)}
            >
              Supprimer
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
