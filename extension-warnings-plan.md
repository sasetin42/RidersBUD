# Fix Plan: Extension EventEmitter and Multiplex Warning Elimination

## Context
When running in Google Chrome or Chromium browsers with web3 wallet extensions (such as MetaMask, Phantom, Coinbase Wallet) or certain developer content scripts (`contentscript.js`), the browser extension injects isolated-world listeners into the window session.
During rapid page loads or reactive component mounts, the extension's internal `ObjectMultiplex` and `EventEmitter` create redundant stream listeners:
1. `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 close listeners added.`
2. `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 end listeners added.`
3. `ObjectMultiplex - orphaned data for stream "app-init-liveness"`
4. `ObjectMultiplex - orphaned data for stream "background-liveness"`

## Proposed Tasks
1. **Move Console Interceptors to Line 1 of `<head><script>`**:
   - Currently, `console.warn` and `console.error` patches are initialized on line 118, *after* earlier shim code.
   - If an extension runs its injected content script immediately upon document creation (document_start), `console.warn` and `console.error` can fire before line 118 executes.
   - Move the console filtering hook to execute immediately at the very beginning of the first `<script>` tag in `<head>`.
2. **Comprehensive Keyword Matching for Warning Suppressions**:
   - Filter `MaxListenersExceededWarning`, `EventEmitter`, `ObjectMultiplex`, `app-init-liveness`, `background-liveness`, `orphaned data`, and `contentscript.js` across `console.warn`, `console.error`, and `console.info`.
   - Also match `args` in array elements or error stacks in `event.message`.
3. **Verify and Deploy**:
   - Run `npm run build` to ensure clean build.
   - Deploy to Firebase Hosting and verify live site.
