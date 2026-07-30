import { useState, type FormEvent } from 'react';

/** The generic error message matching the backend's INVALID_CREDENTIALS_MESSAGE. */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password.';

interface LoginScreenProps {
  onSuccess: () => void;
  sessionExpired?: boolean;
}

/**
 * Login/Authentication screen.
 *
 * On failure, displays the generic invalid-credential error message
 * without indicating which field was wrong. On session idle-timeout,
 * presents a re-authentication prompt without discarding the customer's
 * in-progress view state.
 *
 * _Requirements: 9.1, 9.2, 9.6_
 */
export function LoginScreen({ onSuccess, sessionExpired = false }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // In production, this calls the Amplify Auth signIn
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // Always show the same generic message regardless of failure reason
        setError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      onSuccess();
    } catch {
      setError(INVALID_CREDENTIALS_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" role="form" aria-label="Login">
      <h1>Claims Portal</h1>
      {sessionExpired && (
        <div className="session-expired-notice" role="alert">
          Your session has expired. Please sign in again to continue.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error && (
          <div className="error-message" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
