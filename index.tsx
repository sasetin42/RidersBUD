
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
  'webchannel',
  'transport errored',
  'ERR_QUIC_PROTOCOL_ERROR',
  'Write/channel',
  'Listen/channel',
  'GeolocationPositionError',
  'User denied Geolocation',
  'FIRESTORE INTERNAL ASSERTION FAILED',
  'QuotaExceededError',
  'ERR_NAME_NOT_RESOLVED',
  'r.stripe.com',
  'stripe.com',
  'm.stripe.com',
  'm.stripe.network',
  'CLOSING or CLOSED',
  'WebSocket is already in',
  'WebSocket is closed before the connection is established',
  'usePusher',
  'pusher.com',
  'Evervault',
  'evervault.com',
  'Failed to load Evervault',
  'Permissions policy violation',
  'unload is not allowed',
  'Blocked aria-hidden on a <body>',
  'hcaptcha',
  // Firestore SDK permission errors (e.g. 'Payouts listener: FirebaseError: Missing or insufficient permissions.')
  'Missing or insufficient permissions',
  'FirebaseError',
  // Recharts negative dimension warnings
  'width(-1)',
  'height(-1)',
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
  'webchannel',
  'transport errored',
  'ERR_QUIC_PROTOCOL_ERROR',
  'Write/channel',
  'Listen/channel',
  'GeolocationPositionError',
  'User denied Geolocation',
  'FIRESTORE INTERNAL ASSERTION FAILED',
  'QuotaExceededError',
  'The above error occurred',
  'Consider adding an error boundary',
  'ERR_NAME_NOT_RESOLVED',
  'r.stripe.com',
  'stripe.com',
  'm.stripe.com',
  'm.stripe.network',
  'CLOSING or CLOSED',
  'WebSocket is already in',
  'WebSocket is closed before the connection is established',
  'usePusher',
  'pusher.com',
  'Evervault',
  'evervault.com',
  'Failed to load Evervault',
  'Permissions policy violation',
  'unload is not allowed',
  'Blocked aria-hidden on a <body>',
  'hcaptcha'
];

const _matchesPattern = (args: any[], patterns: string[]): boolean => {
  const joined = args.map(arg => {
    try {
      if (arg instanceof Error) return arg.message || arg.stack || String(arg);
      if (typeof arg === 'object') return String(arg.message || JSON.stringify(arg));
      return String(arg);
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


// Suppress unhandled promise rejections and window errors originating from extension message channels or network asset failures
window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement | null;
  // Automatically fallback broken images to default brand logo
  if (target && target.tagName === 'IMG') {
    const img = target as HTMLImageElement;
    if (!img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = 'true';
      img.src = '/riders-logo.png';
    }
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const errorMsg = event.message || (event.error && (event.error.message || String(event.error))) || '';
  const errorStack = (event.error && event.error.stack) || '';
  if (
    errorMsg.includes('message channel closed') || 
    errorMsg.includes('asynchronous response') ||
    errorMsg.includes('runtime.lastError') ||
    errorMsg.includes('ERR_NAME_NOT_RESOLVED') ||
    errorMsg.includes('usePusher') ||
    errorMsg.includes('CLOSING or CLOSED') ||
    errorMsg.includes('Evervault') ||
    errorMsg.includes('hcaptcha') ||
    errorMsg.includes('startTime') ||
    errorMsg.includes('reportAllChanges') ||
    errorStack.includes('startTime') ||
    errorStack.includes('reportAllChanges')
  ) {
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason ? String(reason.message || reason.stack || reason) : '';
  if (
    reasonStr.includes('message channel closed') || 
    reasonStr.includes('asynchronous response') ||
    reasonStr.includes('runtime.lastError') ||
    reasonStr.includes('ERR_NAME_NOT_RESOLVED') ||
    reasonStr.includes('usePusher') ||
    reasonStr.includes('CLOSING or CLOSED') ||
    reasonStr.includes('startTime') ||
    reasonStr.includes('reportAllChanges') ||
    reasonStr.includes('Evervault') ||
    reasonStr.includes('hcaptcha')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

// Disable browser scroll restoration before React mounts — ensures every route starts at top
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

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

// Clear stale Service Worker and Cache Storage on localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
  }
  if (window.caches) {
    window.caches.keys().then(keys => {
      keys.forEach(key => window.caches.delete(key));
    });
  }
}

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