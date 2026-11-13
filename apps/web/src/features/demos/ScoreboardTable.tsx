import { formatDecimal, formatPercent } from '../../lib/format';
import type { ScoreboardRow } from '../../lib/types';
import './scoreboard.css';

interface ScoreboardTableProps {
  rows: ScoreboardRow[];
  selectedId: string | null;
  onSelect: (playerId: string) => void;
}

export function ScoreboardTable({ rows, selectedId, onSelect }: ScoreboardTableProps) {
  return (
    <div className="scoreboard">
      <table>
        <caption className="visually-hidden">Scoreboard du match</caption>
        <thead>
          <tr>
            <th scope="col">Joueur</th>
            <th scope="col">Équipe</th>
            <th scope="col">K</th>
            <th scope="col">D</th>
            <th scope="col">A</th>
            <th scope="col">ADR</th>
            <th scope="col">HS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} aria-selected={row.id === selectedId}>
              <th scope="row">
                <button
                  type="button"
                  className="scoreboard__pick"
                  aria-pressed={row.id === selectedId}
                  onClick={() => onSelect(row.id)}
                >
                  {row.name}
                </button>
              </th>
              <td>{row.team ?? '—'}</td>
              <td>{row.kills}</td>
              <td>{row.deaths}</td>
              <td>{row.assists}</td>
              <td>{formatDecimal(row.adr, 1)}</td>
              <td>{formatPercent(row.hsPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
