import { generateSampleReplay, SAMPLE_PLAYER_ID } from '@cs2/core';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { prefersReducedMotion } from '../lib/motion';
import { ReplayPlayer } from '../features/replay/ReplayPlayer';
import { ReportPanel } from '../features/report/ReportPanel';
import { createLandingReport } from './sampleReport';
import './landing.css';

/** Where the project author's other work lives. */
export const OWNER_GITHUB_URL = 'https://github.com/Pousset';

const PLAN_ROWS: { feature: string; free: string; premium: string }[] = [
  { feature: 'Démos analysées par jour', free: '1', premium: 'Illimité' },
  { feature: 'Replay 2D round par round', free: 'Inclus', premium: 'Inclus' },
  { feature: 'Scoreboard et statistiques de base', free: 'Inclus', premium: 'Inclus' },
  { feature: 'Note détaillée et KAST', free: 'Aperçu', premium: 'Inclus' },
  { feature: 'Conseils personnalisés', free: '1 conseil', premium: 'Tous les conseils' },
  { feature: 'Heatmaps et analyse des utilitaires', free: 'Non', premium: 'Bientôt' },
];

const ENGINEERING_POINTS = [
  'Logique métier pure et testée, partagée entre l’API et le front (@cs2/core).',
  'API NestJS : authentification JWT, quota journalier sans faille de concurrence, upload validé.',
  'Parsing des démos derrière une interface, remplaçable sans toucher au reste.',
  'Intégration continue, linter, typage strict et historique de commits atomiques.',
];

export function LandingPage() {
  const replay = useMemo(() => generateSampleReplay(), []);
  const report = useMemo(() => createLandingReport(), []);

  return (
    <>
      <section className="hero container">
        <div className="hero__copy">
          <h1>Revois chaque round. Comprends tes erreurs.</h1>
          <p className="hero__lead">
            Dépose une démo CS2 et obtiens un replay 2D, tes statistiques et des conseils pour
            progresser. Une démo gratuite par jour, sans carte bancaire.
          </p>
          <div className="hero__actions">
            <Link to="/inscription" className="btn btn--primary">
              Analyser ma première démo
            </Link>
            <Link to="/connexion" className="btn">
              J’ai déjà un compte
            </Link>
          </div>
        </div>
        <div className="hero__demo">
          <ReplayPlayer
            replay={replay}
            autoPlay={!prefersReducedMotion()}
            highlightId={SAMPLE_PLAYER_ID}
          />
          <p className="muted hero__caption">Match d’exemple sur une carte fictive.</p>
        </div>
      </section>

      <section className="container section" aria-labelledby="rapport">
        <h2 id="rapport">Ce que tu obtiens après chaque match</h2>
        <p>
          Les statistiques de base sont toujours visibles. Le détail, la note exacte et tous les
          conseils se débloquent avec Premium.
        </p>
        <div className="section__report">
          <ReportPanel report={report} />
        </div>
      </section>

      <section className="container section" aria-labelledby="offres">
        <h2 id="offres">Gratuit ou Premium</h2>
        <div className="table-wrap">
          <table className="plans">
            <caption className="visually-hidden">Comparaison des offres Gratuit et Premium</caption>
            <thead>
              <tr>
                <th scope="col">Fonctionnalité</th>
                <th scope="col">Gratuit</th>
                <th scope="col">Premium</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td>{row.free}</td>
                  <td>{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/inscription" className="btn btn--primary">
          Créer un compte gratuit
        </Link>
      </section>

      <section className="container section about" aria-labelledby="apropos">
        <h2 id="apropos">Un projet construit comme un vrai produit</h2>
        <p>
          csClimb.gg est un projet de développement full-stack, conçu pour montrer une
          approche rigoureuse : code testé, architecture claire, livraison continue.
        </p>
        <ul className="about__list">
          {ENGINEERING_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <a className="btn" href={OWNER_GITHUB_URL} target="_blank" rel="noreferrer">
          Voir mon GitHub
        </a>
      </section>
    </>
  );
}
