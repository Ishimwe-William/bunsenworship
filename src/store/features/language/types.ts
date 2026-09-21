export type LanguageCode = 'en' | 'rw';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export interface NavigationTranslations {
  liveShow: string;
  mediaLibrary: string;
  integrations: string;
  outputs: string;
  remotes: string;
  settings: string;
  collapse: string;
  expand: string;
}

export interface CommonTranslations {
  appName: string;
  consoleSubtitle: string;
  onAir: string;
  edit: string;
  save: string;
  cancel: string;
  preview: string;
  standby: string;
  live: string;
  connected: string;
  ready: string;
  language: string;
  english: string;
  kinyarwanda: string;
}

export interface ThemeTranslations {
  title: string;
  description: string;
  light: string;
  dark: string;
  system: string;
  configuredMode: string;
  effectiveTheme: string;
  osDetected: string;
  darkModeActive: string;
}

export interface LiveShowTranslations {
  title: string;
  description: string;
  blackScreen: string;
  clearText: string;
  logo: string;
  blackShort: string;
  clearShort: string;
  logoShort: string;
  goLive: string;
  goLiveShort: string;
  offAir: string;
  nextSlide: string;
  takeLive: string;
  verse: string;
  chorus: string;
}

export interface SettingsTranslations {
  title: string;
  description: string;
  languageSectionTitle: string;
  languageSectionDesc: string;
  performanceTitle: string;
  performanceDesc: string;
  gpuAcceleration: string;
  smoothTransitions: string;
  autoBlank: string;
}

export interface AuthTranslations {
  signInTitle: string;
  signInSubtitle: string;
  signUpTitle: string;
  signUpSubtitle: string;
  pinTitle: string;
  pinSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  churchLabel: string;
  churchPlaceholder: string;
  rememberMe: string;
  forgotPassword: string;
  signInButton: string;
  signUpButton: string;
  verifyButton: string;
  orContinueWith: string;
  googleSignIn: string;
  dontHaveAccount: string;
  alreadyHaveAccount: string;
  createOne: string;
  resendPin: string;
  resendIn: string;
  backToLogin: string;
  invalidEmail: string;
  passwordTooShort: string;
  passwordsDoNotMatch: string;
  forgotPasswordTitle: string;
  forgotPasswordSubtitle: string;
  sendResetCode: string;
  resetPasswordTitle: string;
  resetPasswordSubtitle: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmNewPasswordLabel: string;
  resetAndSignIn: string;
  passwordResetSuccess: string;
  pinRequired: string;
  demoHint: string;
  signOut: string;
}

export interface TranslationDictionary {
  nav: NavigationTranslations;
  common: CommonTranslations;
  theme: ThemeTranslations;
  liveShow: LiveShowTranslations;
  settings: SettingsTranslations;
  auth: AuthTranslations;
}

export interface LanguageState {
  currentLanguage: LanguageCode;
}
