/**
 * Recovery for a tab running a build the server no longer has.
 *
 * The service worker serves the cached index.html and main-*.js until it notices a new
 * deployment. Each deployment ships only the new build, so the cached build's chunk-*.js
 * files now 404 and the app cannot load them. A reload recovers: by then the service worker
 * has marked the cached build as broken and fetches the current index.html from the server.
 *
 * The same rule lives in the inline script in src/index.html, which covers failures before
 * Angular starts. Keep the key and the window in step with it.
 */

// sessionStorage key: when this tab last reloaded to recover from a stale build
export const STALE_BUILD_RELOAD_KEY = 'staleBuildReloadAt'
// at most one recovery reload per tab in this window, so a build that is really broken
// (or a server that really lacks the files) cannot put the tab in a reload loop
export const STALE_BUILD_RELOAD_WINDOW_MS = 30000

// how each browser (and the older webpack build) reports a lazy chunk that failed to load
const STALE_BUILD_ERROR = new RegExp([
  'ChunkLoadError',
  'Loading chunk [^ ]+ failed',
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
].join('|'))

/** True for an error caused by a chunk of the running build failing to load. */
export function isStaleBuildError(error: any): boolean {
  const messages = [error && error.message, error && error.rejection && error.rejection.message, String(error)]
  return messages.some(message => typeof message === 'string' && STALE_BUILD_ERROR.test(message))
}

/**
 * Reloads the page to pick up the current build, unless this tab already did so in the last
 * STALE_BUILD_RELOAD_WINDOW_MS. Returns true when it reloads.
 * Without sessionStorage it cannot tell whether it already reloaded, so it does not reload.
 */
export function reloadForStaleBuild(reason: string): boolean {
  try {
    const last = Number(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)) || 0
    if (Date.now() - last < STALE_BUILD_RELOAD_WINDOW_MS) {
      return false
    }
    sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  // tslint:disable-next-line: no-console
  console.warn(`Reloading to load the current build: ${reason}`)
  window.location.reload()
  return true
}
