import { Injectable, ErrorHandler } from '@angular/core'
import { isStaleBuildError, reloadForStaleBuild } from './stale-build-recovery'

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandlingService implements ErrorHandler {

  constructor() { }

  handleError(error: any): void {
    // a lazy chunk of this build is gone from the server (a deployment happened since the
    // tab loaded): reload once to pick up the current build. Anything else is rethrown as before
    if (isStaleBuildError(error) && reloadForStaleBuild('a lazy chunk failed to load')) {
      return
    }
    throw error
  }
}
