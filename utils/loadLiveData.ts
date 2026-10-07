/**
 * Runtime loader for `data/liveData.json` (the ~2.2 MB local fallback dataset).
 *
 * Why this exists:
 * - Importing the file with a plain `import('../data/liveData.json')` bakes it
 *   into a JavaScript chunk, which made Vite emit
 *   "Some chunks are larger than 1200 kB after minification" on every build and
 *   forces the browser to parse 2.2 MB of JSON as JavaScript.
 * - Importing it with the `?url` suffix emits the raw JSON as a static asset
 *   instead. It is only downloaded (and parsed with the much faster JSON.parse)
 *   when a fallback path actually needs it — same laziness as before.
 *
 * The in-memory promise cache keeps every caller (DatabaseContext,
 * BookingConfirmationScreen, ...) sharing a single request for the lifetime of
 * the page.
 */

let liveDataPromise: Promise<Record<string, any>> | null = null;

export const loadLiveData = (): Promise<Record<string, any>> => {
  if (!liveDataPromise) {
    liveDataPromise = import('../data/liveData.json?url')
      .then(async (assetModule) => {
        const response = await fetch(assetModule.default);
        if (!response.ok) {
          throw new Error(`Failed to load liveData.json (HTTP ${response.status})`);
        }
        return (await response.json()) as Record<string, any>;
      })
      .catch((error) => {
        // Allow the next caller to retry instead of caching the failure forever
        liveDataPromise = null;
        throw error;
      });
  }
  return liveDataPromise;
};
