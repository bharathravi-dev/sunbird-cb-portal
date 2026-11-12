import { SLOW_STARTUP_STEP_MS, settlesWithin, startupStatus } from './startup-status'

describe('startupStatus', () => {
  beforeEach(() => startupStatus.reset())
  afterAll(() => startupStatus.reset())

  it('passes a step\'s result through and records it', async () => {
    await expect(startupStatus.step('user-read', async () => 'user')).resolves.toBe('user')
    expect(startupStatus.steps).toEqual([{ name: 'user-read', ms: expect.any(Number), failed: false }])
  })

  it('passes a step\'s error through and records the step as failed', async () => {
    const error = new Error('504')
    await expect(startupStatus.step('global-config', async () => { throw error })).rejects.toBe(error)
    expect(startupStatus.steps[0]).toEqual({ name: 'global-config', ms: expect.any(Number), failed: true })
  })

  it('names a slow step in the console', async () => {
    jest.useFakeTimers()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const now = jest.spyOn(performance, 'now')
    now.mockReturnValueOnce(0).mockReturnValue(SLOW_STARTUP_STEP_MS + 1)

    await startupStatus.step('environment', async () => undefined)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"environment" took'))
    warn.mockRestore()
    now.mockRestore()
    jest.useRealTimers()
  })

  it('finish() ends booting and exposes the steps for support', () => {
    startupStatus.timedOut = true
    startupStatus.finish()
    expect(startupStatus.booting).toBe(false)
    expect((window as any).__igotStartup).toEqual({ timedOut: true, steps: startupStatus.steps })
  })
})

describe('settlesWithin', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('is true when the work resolves in time', async () => {
    const result = settlesWithin(Promise.resolve('done'), 1000)
    await expect(result).resolves.toBe(true)
  })

  it('is true when the work rejects in time - it never rejects itself', async () => {
    const result = settlesWithin(Promise.reject(new Error('x')), 1000)
    await expect(result).resolves.toBe(true)
  })

  it('is false when the time runs out first', async () => {
    const result = settlesWithin(new Promise(() => undefined), 1000)
    jest.advanceTimersByTime(1000)
    await expect(result).resolves.toBe(false)
  })
})
