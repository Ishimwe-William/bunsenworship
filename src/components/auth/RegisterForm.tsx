import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loginSuccess,
  requestPinVerification,
  selectAuthError,
  selectAuthLoading,
  setAuthScreen,
  setError,
  setLoading,
} from '../../store/features/auth';
import { isValidEmail } from '../../store/features/auth/authService';
import { useLanguage } from '../language';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from '../common/Icons';

export const RegisterForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      dispatch(setError('Please enter your full name'));
      return;
    }

    if (!isValidEmail(email)) {
      dispatch(setError(t.auth.invalidEmail));
      return;
    }

    if (!password || password.length < 6) {
      dispatch(setError(t.auth.passwordTooShort));
      return;
    }

    if (password !== confirmPassword) {
      dispatch(setError(t.auth.passwordsDoNotMatch));
      return;
    }

    dispatch(setLoading(true));

    // Move to PIN verification step to verify the email
    setTimeout(() => {
      dispatch(
        requestPinVerification({
          email: email.trim(),
          purpose: 'registration',
        }),
      );
    }, 500);
  };

  const handleGoogleSignUp = () => {
    dispatch(setLoading(true));

    // Direct Google authentication
    setTimeout(() => {
      dispatch(
        loginSuccess({
          id: 'google_' + Date.now(),
          name: 'Eric Kwizera',
          email: 'eric.kwizera@gmail.com',
          role: 'Media Director',
          authProvider: 'google',
        }),
      );
    }, 700);
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">{t.auth.signUpTitle}</h2>
        <p className="auth-subtitle">{t.auth.signUpSubtitle}</p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Full Name */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-name">
            {t.auth.fullNameLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="register-name"
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.fullNamePlaceholder}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-email">
            {t.auth.emailLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="register-email"
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

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-password">
            {t.auth.passwordLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordPlaceholder}
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-confirm">
            {t.auth.confirmPasswordLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="register-confirm"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.auth.confirmPasswordLabel}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-auth-submit"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : t.auth.signUpButton}
        </button>
      </form>

      {/* Divider */}
      <div className="auth-divider">
        <span>{t.auth.orContinueWith}</span>
      </div>

      {/* Google Sign-in */}
      <GoogleSignInButton
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        label={t.auth.googleSignIn}
      />

      {/* Switch to Login */}
      <div className="auth-footer">
        <span>{t.auth.alreadyHaveAccount} </span>
        <button
          type="button"
          className="auth-link"
          onClick={() => dispatch(setAuthScreen('login'))}
        >
          {t.auth.signInButton}
        </button>
      </div>
    </div>
  );
};
