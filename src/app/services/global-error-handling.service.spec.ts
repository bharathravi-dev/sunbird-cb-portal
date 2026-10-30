import { GlobalErrorHandlingService } from './global-error-handling.service'
import { isStaleBuildError, reloadForStaleBuild, STALE_BUILD_RELOAD_KEY } from './stale-build-recovery'

describe('stale build recovery', () => {
  const originalLocation = window.location
  let reload: jest.Mock

  beforeEach(() => {
    sessionStorage.clear()
    reload = jest.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, reload } })
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    jest.restoreAllMocks()
  })

  describe('isStaleBuildError', () => {
    it.each([
      'Failed to fetch dynamically imported module: https://portal/chunk-T3UW2KOR.js',
      'error loading dynamically imported module: https://portal/chunk-T3UW2KOR.js',
      'Importing a module script failed.',
      'ChunkLoadError: Loading chunk 12 failed.',
      'Loading chunk 12 failed.',
    ])('recognises "%s"', (message) => {
      expect(isStaleBuildError(new TypeError(message))).toBe(true)
    })

    it('recognises the error inside an unhandled promise rejection', () => {
      const wrapped: any = new Error('Uncaught (in promise)')
      wrapped.rejection = new TypeError('Failed to fetch dynamically imported module: /chunk-A.js')
      expect(isStaleBuildError(wrapped)).toBe(true)
    })

    it.each([
      new Error('Cannot read properties of null (reading \'addEventListener\')'),
      new Error('Http failure response for /apis/x: 504 Gateway Timeout'),
      null,
      undefined,
      'plain string',
    ])('ignores other errors (%p)', (error) => {
      expect(isStaleBuildError(error)).toBe(false)
    })
  })

  describe('reloadForStaleBuild', () => {
    it('reloads once and records when', () => {
      expect(reloadForStaleBuild('test')).toBe(true)
      expect(reload).toHaveBeenCalledTimes(1)
      expect(Number(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY))).toBeGreaterThan(0)
    })

    it('does not reload again within 30 seconds, so it cannot loop', () => {
      reloadForStaleBuild('first')
      expect(reloadForStaleBuild('second')).toBe(false)
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads again once 30 seconds have passed', () => {
      sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, String(Date.now() - 31000))
      expect(reloadForStaleBuild('later')).toBe(true)
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('does not reload when sessionStorage is unavailable', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
      expect(reloadForStaleBuild('no storage')).toBe(false)
      expect(reload).not.toHaveBeenCalled()
    })
  })

  describe('GlobalErrorHandlingService', () => {
    const service = new GlobalErrorHandlingService()

    it('reloads for a chunk that failed to load', () => {
      expect(() => service.handleError(new TypeError('Failed to fetch dynamically imported module: /chunk-A.js'))).not.toThrow()
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('rethrows a chunk failure when it already reloaded, instead of looping', () => {
      const error = new TypeError('Failed to fetch dynamically imported module: /chunk-A.js')
      service.handleError(error)
      expect(() => service.handleError(error)).toThrow(error)
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('rethrows every other error unchanged, as before', () => {
      const error = new Error('something else')
      expect(() => service.handleError(error)).toThrow(error)
      expect(reload).not.toHaveBeenCalled()
    })
  })
})
