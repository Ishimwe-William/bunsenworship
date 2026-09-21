import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loginSuccess,
  pinVerifiedForReset,
  selectAuthError,
  selectAuthLoading,
  selectPendingEmail,
  selectPinPurpose,
  setAuthScreen,
  setError,
  setLoading,
} from '../../store/features/auth';
import { maskEmail } from '../../store/features/auth/authService';
import { useLanguage } from '../language';
import { AlertCircleIcon, ArrowLeftIcon, LightbulbIcon, MailIcon } from '../common/Icons';

export const PinVerificationForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const pendingEmail = useAppSelector(selectPendingEmail) || 'worship.leader@gmail.com';
  const pinPurpose = useAppSelector(selectPinPurpose);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const { t } = useLanguage();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(45);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resending PIN
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const cleanValue = value.replace(/\D/g, '');

    if (!cleanValue) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const char = cleanValue[cleanValue.length - 1];
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Automatically advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Go back to previous box on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = digits.join('');

    if (pin.length < 6) {
      dispatch(setError(t.auth.pinRequired));
      return;
    }

    dispatch(setLoading(true));

    // Accepts any 6-digit pin for testing (or demo 123456)
    setTimeout(() => {
      if (pinPurpose === 'password-reset') {
        dispatch(pinVerifiedForReset());
      } else {
        dispatch(
          loginSuccess({
            id: 'verified_' + Date.now(),
            name: pendingEmail.split('@')[0].replace(/[._]/g, ' '),
            email: pendingEmail,
            role: 'Verified Minister',
            authProvider: 'email',
            churchName: 'Bunsen Sanctuary Global',
          }),
        );
      }
    }, 700);
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(45);
    dispatch(setError(null));
    // Clear inputs and refocus
    setDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const handleFillDemoPin = () => {
    setDigits(['1', '2', '3', '4', '5', '6']);
    inputRefs.current[5]?.focus();
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">{t.auth.pinTitle}</h2>
        <p className="auth-subtitle">{t.auth.pinSubtitle}</p>
      </div>

      {/* Masked destination email badge */}
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

      <form onSubmit={handleVerify}>
        {/* 6 Individual PIN Input Boxes */}
        <div className="pin-input-group">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              className={`pin-digit-box ${digit ? 'filled' : ''}`}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              autoComplete="one-time-code"
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-auth-submit"
          disabled={isLoading || digits.join('').length < 6}
        >
          {isLoading ? 'Verifying...' : t.auth.verifyButton}
        </button>
      </form>

      {/* Resend Code Section */}
      <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          {countdown > 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>
              {t.auth.resendIn} <strong>{countdown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              className="auth-link"
              onClick={handleResend}
            >
              {t.auth.resendPin}
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            className="auth-link"
            onClick={() =>
              dispatch(setAuthScreen(pinPurpose === 'password-reset' ? 'forgot-password' : 'login'))
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeftIcon size={14} />
            <span>{t.auth.backToLogin}</span>
          </button>
        </div>
      </div>

      {/* Demo PIN quick fill */}
      <div className="auth-demo-hint">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
          <LightbulbIcon size={14} />
          <span>Need demo code?</span>
        </div>
        <button
          type="button"
          className="auth-link"
          onClick={handleFillDemoPin}
          style={{ textDecoration: 'underline' }}
        >
          Auto-fill PIN: 123456
        </button>
      </div>
    </div>
  );
};
