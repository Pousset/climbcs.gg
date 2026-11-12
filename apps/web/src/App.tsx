import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="connexion" element={<AuthPage mode="login" />} />
        <Route path="inscription" element={<AuthPage mode="register" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
