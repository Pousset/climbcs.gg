import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import './layout.css';

export function AppLayout() {
  const { status, user, logout } = useAuth();
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="csClimb.gg, accueil">
            <span className="brand__mark" aria-hidden="true" />
            csClimb.gg
          </Link>
          <nav aria-label="Navigation principale" className="site-nav">
            {status === 'authenticated' ? (
              <>
                <NavLink to="/tableau-de-bord">Mes démos</NavLink>
                <span className="muted">{user?.username}</span>
                <button type="button" className="btn" onClick={logout}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <NavLink to="/connexion">Connexion</NavLink>
                <Link to="/inscription" className="btn btn--primary">
                  Créer un compte
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="contenu">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <p className="muted">
            Projet indépendant, non affilié à Valve. Counter-Strike est une marque de Valve
            Corporation.
          </p>
        </div>
      </footer>
    </>
  );
}
