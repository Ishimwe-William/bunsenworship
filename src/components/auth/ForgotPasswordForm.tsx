import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearError,
  requestPinVerification,
  selectAuthError,
  selectAuthLoading,
  selectPendingEmail,
  setAuthScreen,
  setError,
  setLoading,
} from '../../store/features/auth';
import { isValidEmail } from '../../store/features/auth/authService';
import { useLanguage } from '../language';
import { AlertCircleIcon, ArrowLeftIcon, MailIcon } from '../common/Icons';

export const ForgotPasswordForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const pendingEmail = useAppSelector(selectPendingEmail);
  const { t } = useLanguage();

  const [email, setEmail] = useState(pendingEmail || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      dispatch(setError(t.auth.invalidEmail));
      return;
    }

    dispatch(setLoading(true));
    dispatch(clearError());

    // Simulate sending 6-digit PIN to email (any provider supported)
    setTimeout(() => {
      dispatch(
        requestPinVerification({
          email: cleanEmail,
          purpose: 'password-reset',
        }),
      );
    }, 600);
  };

  const handleBackToLogin = () => {
    dispatch(clearError());
    dispatch(setAuthScreen('login'));
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">{t.auth.forgotPasswordTitle}</h2>
        <p className="auth-subtitle">{t.auth.forgotPasswordSubtitle}</p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="forgot-email">
            {t.auth.emailLabel}
          </label>
          <div className="auth-input-wrapper">
            <input
              id="forgot-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) dispatch(clearError());
              }}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          <span className="auth-hint">
            Accepts any email provider (Gmail, Outlook, Yahoo, Proton, or custom domain)
          </span>
        </div>

        <button
          type="submit"
          className="btn-auth-submit"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            'Sending PIN...'
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <MailIcon size={16} />
              {t.auth.sendResetCode}
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
