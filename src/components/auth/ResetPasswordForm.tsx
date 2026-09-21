import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearError,
  loginSuccess,
  selectAuthError,
  selectAuthLoading,
  selectPendingEmail,
  setAuthScreen,
  setError,
  setLoading,
} from '../../store/features/auth';
import { maskEmail } from '../../store/features/auth/authService';
import { useLanguage } from '../language';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  MailIcon,
} from '../common/Icons';

export const ResetPasswordForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const pendingEmail = useAppSelector(selectPendingEmail) || 'user@example.com';
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const { t } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      dispatch(setError(t.auth.passwordTooShort));
      return;
    }

    if (password !== confirmPassword) {
      dispatch(setError(t.auth.passwordsDoNotMatch));
      return;
    }

    dispatch(setLoading(true));
    dispatch(clearError());

    // Simulate saving new password and authenticating session
    setTimeout(() => {
      const emailPrefix = pendingEmail.split('@')[0].replace(/[._]/g, ' ');
      dispatch(
        loginSuccess({
          id: 'user_' + Date.now(),
          name: emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1),
          email: pendingEmail,
          role: 'Console Administrator',
          authProvider: 'email',
          churchName: 'Bunsen Sanctuary Global',
        }),
      );
    }, 700);
  };

  const handleBackToLogin = () => {
    dispatch(clearError());
    dispatch(setAuthScreen('login'));
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">{t.auth.resetPasswordTitle}</h2>
        <p className="auth-subtitle">{t.auth.resetPasswordSubtitle}</p>
      </div>

      {/* Target account email badge */}
      <div className="pin-info-badge">
        <MailIcon size={14} />
        <span>{maskEmail(pendingEmail)}</span>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* New Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-new-password">
            {t.auth.newPasswordLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) dispatch(clearError());
              }}
              placeholder={t.auth.newPasswordPlaceholder}
              autoComplete="new-password"
              autoFocus
              required
            />
            <button
              type="button"
              className="auth-toggle-pwd"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-confirm-password">
            {t.auth.confirmNewPasswordLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) dispatch(clearError());
              }}
              placeholder={t.auth.confirmPasswordLabel}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="auth-toggle-pwd"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn-auth-submit"
          disabled={isLoading || !password || !confirmPassword}
        >
          {isLoading ? (
            'Updating Password...'
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <KeyIcon size={16} />
              {t.auth.resetAndSignIn}
            </span>
          )}
        </button>
      </form>

      <div className="auth-footer" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          className="auth-link"
          onClick={handleBackToLogin}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeftIcon size={14} />
          <span>{t.auth.backToLogin}</span>
        </button>
      </div>
    </div>
  );
};
