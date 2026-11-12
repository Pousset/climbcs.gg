import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container page">
      <h1>Page introuvable</h1>
      <p>Cette page n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn">
        Retour à l’accueil
      </Link>
    </div>
  );
}
