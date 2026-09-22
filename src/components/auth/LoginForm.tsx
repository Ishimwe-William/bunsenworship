import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loginSuccess,
  selectAuthError,
  selectAuthLoading,
  setAuthScreen,
  setError,
  setLoading,
  isValidEmail,
} from '../../store';
import { useLanguage } from '../language';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AlertCircleIcon, EyeIcon, EyeOffIcon, LightbulbIcon } from '../common/Icons';

export const LoginForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      dispatch(setError(t.auth.invalidEmail));
      return;
    }

    if (!password || password.length < 6) {
      dispatch(setError(t.auth.passwordTooShort));
      return;
    }

    dispatch(setLoading(true));

    // Simulate authentication processing
    setTimeout(() => {
      dispatch(
        loginSuccess({
          id: 'usr_' + Date.now(),
          name: email.split('@')[0].replace(/[._]/g, ' '),
          email: email.trim(),
          role: 'Worship Leader',
          authProvider: 'email',
          churchName: 'Bunsen Sanctuary',
        }),
      );
    }, 600);
  };

  const handleGoogleSignIn = () => {
    dispatch(setLoading(true));

    // Simulates Google OAuth flow (accepts any Google user email)
    setTimeout(() => {
      dispatch(
        loginSuccess({
          id: 'google_' + Date.now(),
          name: 'William Ishimwe',
          email: 'william.ishimwe@gmail.com',
          role: 'Console Administrator',
          authProvider: 'google',
          churchName: 'Kigali Worship Center',
        }),
      );
    }, 700);
  };

  const handleForgotPassword = () => {
    dispatch(setAuthScreen('forgot-password'));
  };

  const handleQuickDemo = () => {
    dispatch(
      loginSuccess({
        id: 'demo_user',
        name: 'Pastor Jean-Claude',
        email: 'pastor.jc@outlook.com',
        role: 'Senior Worship Director',
        authProvider: 'email',
        churchName: 'Grace Chapel Kigali',
      }),
    );
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">{t.auth.signInTitle}</h2>
        <p className="auth-subtitle">{t.auth.signInSubtitle}</p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Email Field - supports any domain */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            {t.auth.emailLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="login-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="auth-field">
          <div className="auth-row">
            <label className="auth-label" htmlFor="login-password">
              {t.auth.passwordLabel}
            </label>
            <button
              type="button"
              className="auth-link"
              onClick={handleForgotPassword}
            >
              {t.auth.forgotPassword}
            </button>
          </div>
          <div className="auth-input-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordPlaceholder}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="auth-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>{t.auth.rememberMe}</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-auth-submit"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : t.auth.signInButton}
        </button>
      </form>

      {/* Divider */}
      <div className="auth-divider">
        <span>{t.auth.orContinueWith}</span>
      </div>

      {/* Google Sign-in */}
      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        label={t.auth.googleSignIn}
      />

      {/* Switch to Register */}
      <div className="auth-footer">
        <span>{t.auth.dontHaveAccount} </span>
        <button
          type="button"
          className="auth-link"
          onClick={() => dispatch(setAuthScreen('register'))}
        >
          {t.auth.createOne}
        </button>
      </div>
    </div>
  );
};
