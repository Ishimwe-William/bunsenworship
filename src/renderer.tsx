import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './components/theme';
import { App } from './App';
import './index.css';

// Ensure media playback, timers, and animations never pause when window is minimized
try {
  Object.defineProperty(document, 'hidden', {
    get: () => false,
    configurable: true,
  });
  Object.defineProperty(document, 'visibilityState', {
    get: () => 'visible',
    configurable: true,
  });
} catch {
  // ignore
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element to mount the application.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
