import React, { useState, useEffect } from 'react';
import { authAPI } from '../api/api';
import './Login.css';

function Login({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
        });
        
        // Render the button after initialization
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: '100%',
            text: 'signin_with'
          }
        );
      }
    };

    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        // Script might already be removed
      }
    };
  }, []);

  const handleGoogleLogin = async (response) => {
    setGoogleLoading(true);
    setError('');

    try {
      const result = await authAPI.googleLogin(response.credential);
      onLoginSuccess(result.data.token, result.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login(email, password);
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to your 3D Animation Editor</p>

        {error && <div className="error-message">{error}</div>}

        {/* Google Sign-In Button */}
        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            <div className="google-signin-container">
              <div id="google-signin-button" className="google-button-wrapper"></div>
            </div>
            <div className="divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength="6"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="toggle-auth">
          Don't have an account?{' '}
          <button
            type="button"
            className="link-btn"
            onClick={onSwitchToSignup}
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
