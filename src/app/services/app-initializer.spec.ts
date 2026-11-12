import { appInitializer } from './app-initializer'
import { STARTUP_DEADLINE_MS, startupStatus } from './startup-status'

describe('appInitializer', () => {
  let logger: { error: jest.Mock }
  let configSvc: { globalConfigLoadFailed: boolean }
  const run = (init: () => Promise<any>) =>
    appInitializer({ init } as any, logger as any, configSvc as any)()

  beforeEach(() => {
    startupStatus.reset()
    logger = { error: jest.fn() }
    configSvc = { globalConfigLoadFailed: false }
  })
  afterEach(() => jest.useRealTimers())
  afterAll(() => startupStatus.reset())

  it('waits for startup when it finishes in time', async () => {
    await run(async () => true)

    expect(configSvc.globalConfigLoadFailed).toBe(false)
    expect(startupStatus.timedOut).toBe(false)
    expect(startupStatus.booting).toBe(false)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs a startup error and carries on, as before', async () => {
    const error = new Error('init failed')
    await run(async () => { throw error })

    expect(logger.error).toHaveBeenCalledWith('ERROR DURING APP INITIALIZATION >', error)
    expect(configSvc.globalConfigLoadFailed).toBe(false)
    expect(startupStatus.booting).toBe(false)
  })

  it('stops waiting at the deadline and switches to the error screen', async () => {
    jest.useFakeTimers()
    const done = run(() => new Promise(() => undefined))   // a hung backend call

    jest.advanceTimersByTime(STARTUP_DEADLINE_MS - 1)
    await Promise.resolve()
    expect(startupStatus.booting).toBe(true)

    jest.advanceTimersByTime(1)
    await done

    expect(startupStatus.timedOut).toBe(true)
    expect(configSvc.globalConfigLoadFailed).toBe(true)
    expect(startupStatus.booting).toBe(false)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('DID NOT FINISH'), expect.any(Array))
  })

  it('still logs an error that only arrives after the deadline', async () => {
    jest.useFakeTimers()
    let fail: (e: any) => void = () => undefined
    const done = run(() => new Promise((_resolve, reject) => { fail = reject }))
    jest.advanceTimersByTime(STARTUP_DEADLINE_MS)
    await done

    const late = new Error('late')
    fail(late)
    await Promise.resolve()
    await Promise.resolve()

    expect(logger.error).toHaveBeenCalledWith('ERROR DURING APP INITIALIZATION >', late)
  })
})
