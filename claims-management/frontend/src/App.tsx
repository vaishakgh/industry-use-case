import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ClaimsDashboard } from './components/ClaimsDashboard';

export type AppView = 'login' | 'dashboard';

export function App() {
  const [view, setView] = useState<AppView>('login');
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleLoginSuccess = () => {
    setView('dashboard');
    setSessionExpired(false);
  };

  const handleSessionTimeout = () => {
    setSessionExpired(true);
    setView('login');
  };

  return (
    <main>
      {view === 'login' && (
        <LoginScreen
          onSuccess={handleLoginSuccess}
          sessionExpired={sessionExpired}
        />
      )}
      {view === 'dashboard' && (
        <ClaimsDashboard onSessionTimeout={handleSessionTimeout} />
      )}
    </main>
  );
}
