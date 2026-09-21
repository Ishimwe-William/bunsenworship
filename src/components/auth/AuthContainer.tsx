import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectAuthScreen } from '../../store/features/auth';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';
import { ThemeToggle } from '../theme';
import { LanguageToggle, useLanguage } from '../language';
import { AuthHero } from './AuthHero';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { PinVerificationForm } from './PinVerificationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import './Auth.css';

export const AuthContainer: React.FC = () => {
  const currentScreen = useAppSelector(selectAuthScreen);
  const { t } = useLanguage();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'register':
        return <RegisterForm />;
      case 'pin-verification':
        return <PinVerificationForm />;
      case 'forgot-password':
        return <ForgotPasswordForm />;
      case 'reset-password':
        return <ResetPasswordForm />;
      case 'login':
      default:
        return <LoginForm />;
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left-Side Visual Hero Panel */}
      <AuthHero />

      {/* Right-Side Form Panel */}
      <div className="auth-form-panel">
        <header className="auth-topbar">
          <div className="auth-mobile-brand">
            <BunsenWorshipLogo size={32} />
            <div>
              <strong>{t.common.appName}</strong>
              <span className="auth-mobile-sub">{t.common.consoleSubtitle}</span>
            </div>
          </div>

          <div className="auth-controls">
            <LanguageToggle variant="segmented" />
            <ThemeToggle variant="compact" />
          </div>
        </header>

        <main className="auth-form-viewport">{renderScreen()}</main>
      </div>
    </div>
  );
};
