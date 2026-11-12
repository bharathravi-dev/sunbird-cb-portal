import { TestBed, inject } from '@angular/core/testing'

import { GeneralGuard } from './general.guard'

describe('GeneralGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeneralGuard],
    })
  })

  it('should ...', inject([GeneralGuard], (guard: GeneralGuard) => {
    expect(guard).toBeTruthy()
  }))
})

describe('GeneralGuard without a user profile', () => {
  const route: any = { data: {}, params: {} }
  const state: any = { url: '/page/home' }
  let authSvc: { loginV2: jest.Mock, force_logout: jest.Mock }
  let configSvc: any
  let guard: GeneralGuard

  beforeEach(() => {
    authSvc = { loginV2: jest.fn().mockResolvedValue(undefined), force_logout: jest.fn() }
    configSvc = { userProfile: null, globalConfig: {}, globalConfigLoadFailed: false }
    const router: any = { parseUrl: jest.fn((url: string) => url), navigateByUrl: jest.fn() }
    const restrictionSvc: any = { isBlockedUrl: () => false }
    guard = new GeneralGuard(router, configSvc, authSvc as any, restrictionSvc)
  })

  it('sends the user to login, as before', async () => {
    await guard.canActivate(route, state)
    expect(authSvc.loginV2).toHaveBeenCalled()
  })

  it('stays on the error screen when startup did not finish in time, instead of going through login', async () => {
    configSvc.globalConfigLoadFailed = true   // set by appInitializer at the startup deadline

    await expect(guard.canActivate(route, state)).resolves.toBe(false)
    expect(authSvc.loginV2).not.toHaveBeenCalled()
    expect(authSvc.force_logout).not.toHaveBeenCalled()
  })
})
