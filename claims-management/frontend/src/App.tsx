import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ClaimsDashboard } from './components/ClaimsDashboard';

export type AppView = 'login' | 'dashboard';

export function App() {
  const [view, setView] = useState<AppView>('login');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [token, setToken] = useState<string>('');

  const handleLoginSuccess = (idToken: string) => {
    setToken(idToken);
    setView('dashboard');
    setSessionExpired(false);
  };

  const handleSessionTimeout = () => {
    setSessionExpired(true);
    setView('login');
  };

  const handleLogout = () => {
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
