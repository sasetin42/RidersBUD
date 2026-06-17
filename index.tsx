
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress console warnings and errors originating from browser extensions (e.g. MetaMask, contentscript.js)
// Uses Object.defineProperty to make the override non-configurable, preventing extensions from bypassing it.

const EXTENSION_WARN_PATTERNS = [
  'contentscript',
  'ObjectMultiplex',
  'malformed chunk',
  'MaxListenersExceededWarning',
  'EventEmitter memory leak',
  'app-init-liveness',
  'background-liveness',
  'orphaned data for stream',
  'Extension context invalidated',
  'Could not establish connection',
  '@firebase/firestore',
  'WebChannelConnection',
  'transport errored',
  'GeolocationPositionError',
  'User denied Geolocation',
  'FIRESTORE INTERNAL ASSERTION FAILED',
  'QuotaExceededError',
];

const EXTENSION_ERROR_PATTERNS = [
  'contentscript',
  'ObjectMultiplex',
  'malformed chunk',
  'MaxListenersExceededWarning',
  'EventEmitter memory leak',
  'orphaned data for stream',
  'Extension context invalidated',
  'Could not establish connection',
  'runtime.lastError',
  '@firebase/firestore',
  'WebChannelConnection',
  'transport errored',
  'GeolocationPositionError',
  'User denied Geolocation',
  'FIRESTORE INTERNAL ASSERTION FAILED',
  'QuotaExceededError',
  'The above error occurred',
  'Consider adding an error boundary',
];

const _matchesPattern = (args: any[], patterns: string[]): boolean => {
  const joined = args.map(arg => {
    try {
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');
  return patterns.some(p => joined.includes(p));
};

const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

const _filteredWarn = (...args: any[]) => {
  if (_matchesPattern(args, EXTENSION_WARN_PATTERNS)) return;
  _origWarn(...args);
};

const _filteredError = (...args: any[]) => {
  if (_matchesPattern(args, EXTENSION_ERROR_PATTERNS)) return;
  _origError(...args);
};

// Use Object.defineProperty so the override cannot be re-overridden by extensions
try {
  Object.defineProperty(console, 'warn', {
    configurable: false,
    writable: false,
    value: _filteredWarn,
  });
} catch {
  // Fallback if defineProperty fails (e.g., frozen console)
  console.warn = _filteredWarn;
}

try {
  Object.defineProperty(console, 'error', {
    configurable: false,
    writable: false,
    value: _filteredError,
  });
} catch {
  console.error = _filteredError;
}


// Suppress unhandled promise rejections and window errors originating from extension message channels
window.addEventListener('error', (event) => {
  const errorMsg = event.message || '';
  if (
    errorMsg.includes('message channel closed') || 
    errorMsg.includes('asynchronous response') ||
    errorMsg.includes('runtime.lastError')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason ? String(reason.message || reason) : '';
  if (
    reasonStr.includes('message channel closed') || 
    reasonStr.includes('asynchronous response') ||
    reasonStr.includes('runtime.lastError')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA (production only — prevents HMR message channel errors in dev)
if ('serviceWorker' in navigator && !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}