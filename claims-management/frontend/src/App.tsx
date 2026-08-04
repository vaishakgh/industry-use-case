import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ClaimsDashboard } from './components/ClaimsDashboard';

export type AppView = 'login' | 'dashboard';

function getInitialView(): AppView {
  const savedToken = sessionStorage.getItem('authToken');
  return savedToken ? 'dashboard' : 'login';
}

export function App() {
  const [view, setView] = useState<AppView>(getInitialView);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [token, setToken] = useState<string>(sessionStorage.getItem('authToken') || '');

  const handleLoginSuccess = (idToken: string) => {
    sessionStorage.setItem('authToken', idToken);
    setToken(idToken);
    setView('dashboard');
    setSessionExpired(false);
  };

  const handleSessionTimeout = () => {
    sessionStorage.removeItem('authToken');
    setSessionExpired(true);
    setView('login');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    setToken('');
    setView('login');
    setSessionExpired(false);
  };

  return (
    <main>
      {view !== 'login' && (
        <nav className="top-nav">
          <span className="nav-brand">Claims FNOL Portal</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      )}
      {view === 'login' && (
        <LoginScreen
          onSuccess={handleLoginSuccess}
          sessionExpired={sessionExpired}
        />
      )}
      {view === 'dashboard' && (
        <ClaimsDashboard onSessionTimeout={handleSessionTimeout} token={token} />
      )}
    </main>
  );
}
