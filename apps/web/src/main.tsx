import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import { App } from './App';
import { ApiClient } from './lib/api';
import { AuthProvider } from './lib/auth';
import { createTokenStore } from './lib/token-store';
import './styles/tokens.css';
import './styles/global.css';

const tokenStore = createTokenStore(window.localStorage);
const client = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  getToken: tokenStore.get,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider client={client} tokenStore={tokenStore}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
