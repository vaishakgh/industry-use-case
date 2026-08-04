import { useState, type FormEvent } from 'react';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password.';
const USER_POOL_CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID || '';
const REGION = import.meta.env.VITE_REGION || 'eu-central-1';
const COGNITO_URL = import.meta.env.VITE_API_URL
  ? `https://cognito-idp.${REGION}.amazonaws.com`
  : '/cognito';

interface LoginScreenProps {
  onSuccess: (token: string) => void;
  sessionExpired?: boolean;
}

export function LoginScreen({ onSuccess, sessionExpired = false }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(COGNITO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: USER_POOL_CLIENT_ID,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        }),
        mode: 'cors',
      });

      const data = await response.json();

      if (!response.ok || !data.AuthenticationResult) {
        setError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      const idToken = data.AuthenticationResult.IdToken;
      onSuccess(idToken);
    } catch {
      setError(INVALID_CREDENTIALS_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" role="form" aria-label="Login">
      <div className="login-branding">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#1a73e8"/>
            <path d="M14 20h20v2H14zM14 26h16v2H14zM14 32h12v2H14zM14 14h20v2H14z" fill="white"/>
            <path d="M34 28l4 4-4 4" stroke="white" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        <h1>Claims FNOL</h1>
        <p className="login-subtitle">Management Portal</p>
        <p className="login-description">Report, track, and manage your insurance claims securely from anywhere.</p>
      </div>
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
          placeholder="Enter your username"
        />
        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {error && (
          <div className="error-message" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="login-footer">Secure login powered by AWS Cognito</p>
      </form>
    </div>
  );
}
