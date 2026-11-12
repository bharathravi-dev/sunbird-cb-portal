import { ConfigurationsService, LoggerService } from '@sunbird-cb/utils-v2'
import { InitService } from './init.service'
import { STARTUP_DEADLINE_MS, settlesWithin, startupStatus } from './startup-status'

/**
 * Startup, with a deadline. Nothing renders until this resolves, and InitService.init() is a
 * chain of API calls without timeouts of their own: one hung backend call kept users on the
 * index.html spinner for minutes. If startup has not finished within STARTUP_DEADLINE_MS, stop
 * waiting and show the app's error screen (globalConfigLoadFailed: Refresh / Log out) instead.
 * init() keeps running in the background; it is not cancelled, only no longer waited for, and
 * the guards check the same flag so a half-loaded user is not sent off to the login page.
 */
export const appInitializer = (initSvc: InitService, logger: LoggerService, configSvc: ConfigurationsService) => async () => {
  // errors are logged and swallowed, as before - whether they come in time or after the deadline
  const init = initSvc.init().catch(error => {
    logger.error('ERROR DURING APP INITIALIZATION >', error)
  })
  const finished = await settlesWithin(init, STARTUP_DEADLINE_MS)
  if (!finished) {
    startupStatus.timedOut = true
    configSvc.globalConfigLoadFailed = true
    logger.error(`APP INITIALIZATION DID NOT FINISH IN ${STARTUP_DEADLINE_MS} MS >`, startupStatus.steps)
  }
  startupStatus.finish()
}
