/**
 * Bookkeeping for application startup (the APP_INITIALIZER, i.e. InitService.init()).
 *
 * Nothing renders until startup finishes: until then the user only sees the spinner from
 * index.html. Startup is a chain of API calls made one after another, none of which has a
 * timeout of its own, so one slow or hung backend call used to keep that spinner up for
 * minutes - until a gateway somewhere gave up - which users report as "the page never loaded".
 *
 * This gives startup an overall deadline (see app.module appInitializer), and records how
 * long each step took, so a slow startup can be traced to the call that caused it.
 *
 * A plain module-level object rather than an injectable service: InitService and the HTTP
 * interceptors are constructed by hand in their specs, and the guards in project/ws must not
 * depend on src/app - they read ConfigurationsService.globalConfigLoadFailed instead.
 */

/**
 * How long startup may take before the app gives up waiting and shows its error screen
 * ("Something went wrong" with Refresh / Log out). Generous on purpose: a slow but working
 * connection should still get in. index.html shows a "taking longer than usual" note with a
 * Reload button well before this (STARTUP_SLOW_NOTICE_MS there).
 */
export const STARTUP_DEADLINE_MS = 45000

/** A startup step slower than this is reported in the console, naming the step */
export const SLOW_STARTUP_STEP_MS = 5000

export interface IStartupStep {
  name: string
  ms: number
  failed: boolean
}

export class StartupStatus {
  /** True until the APP_INITIALIZER has finished, or given up at the deadline */
  booting = true
  /** True when startup did not finish within STARTUP_DEADLINE_MS */
  timedOut = false
  readonly steps: IStartupStep[] = []

  /**
   * Runs one startup step and records its duration - as a performance measure
   * (`igot-startup:<name>`, visible in the DevTools Performance panel and in traces) and in
   * `steps`. The step's result and errors pass through unchanged.
   */
  async step<T>(name: string, run: () => Promise<T>): Promise<T> {
    const start = now()
    let failed = false
    try {
      return await run()
    } catch (error) {
      failed = true
      throw error
    } finally {
      const ms = Math.round(now() - start)
      this.steps.push({ name, ms, failed })
      measure(`igot-startup:${name}`, start)
      if (ms >= SLOW_STARTUP_STEP_MS) {
        // tslint:disable-next-line: no-console
        console.warn(`[startup] "${name}" took ${ms} ms${failed ? ' and failed' : ''}`)
      }
    }
  }

  /** Startup is over (finished or given up): later requests are ordinary requests again */
  finish(): void {
    this.booting = false
    try {
      // for support: type __igotStartup in the console of an affected session
      (window as any).__igotStartup = { timedOut: this.timedOut, steps: this.steps }
    } catch {
      // not essential
    }
  }

  /** Back to the initial state - for tests */
  reset(): void {
    this.booting = true
    this.timedOut = false
    this.steps.length = 0
  }
}

export const startupStatus = new StartupStatus()

/**
 * Resolves true when `work` settles (resolves or rejects) within `ms`, false when the time
 * runs out first. Never rejects; the timer is cleared as soon as `work` settles.
 */
export function settlesWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), ms)
    const done = () => {
      clearTimeout(timer)
      resolve(true)
    }
    work.then(done, done)
  })
}

function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
}

function measure(name: string, start: number): void {
  try {
    performance.measure(name, { start, end: now() })
  } catch {
    // older browsers: the duration is still in `steps`
  }
}
