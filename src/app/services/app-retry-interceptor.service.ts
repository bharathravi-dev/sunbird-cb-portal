import { Injectable } from '@angular/core'
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http'
import { Observable, throwError, timer } from 'rxjs'
import { retryWhen, mergeMap } from 'rxjs/operators'
import { EXCLUDED_APIS_FROM_RETRY } from '../constants/excluded-apis.constant'
import { startupStatus } from './startup-status'

const EXCLUDE_RETRY = EXCLUDED_APIS_FROM_RETRY

@Injectable({
  providedIn: 'root',
})
export class AppRetryInterceptorService implements HttpInterceptor {
  private maxAttempts = 1
  private scalingDuration = 5000
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // POST is not idempotent — a retry could create duplicates, so fail on the first error
    // No retries while the app is starting: a retried 5xx (usually a 504 gateway timeout) only
    // doubled the time users spent on the index.html spinner, and startup has its own deadline
    if (req.method === 'POST' || req.body?.excludeRetry || startupStatus.booting) {
      return next.handle(req)
    }
    return next.handle(req).pipe(retryWhen(this.genericRetryStrategy()))
  }
  // private shouldRetry = (error: HttpErrorResponse) => error.status > 499
  private shouldRetry = (error: HttpErrorResponse) => {
    const isExcludedEndpoint = EXCLUDE_RETRY.some(endpoint => error.url?.includes(endpoint))
    return error.status > 499 && !isExcludedEndpoint
  }

  private genericRetryStrategy = () => (attempts: Observable<any>) =>
    attempts.pipe(
      mergeMap((error: HttpErrorResponse, i: number) => {
        const retryAttempt = i + 1
        // if maximum number of retries have been met
        // or response is a status code we don't wish to retry, throw error
        if (retryAttempt > this.maxAttempts || !this.shouldRetry(error)) {
          return throwError(error)
        }
        // retry after 1s, 2s, etc...
        return timer(retryAttempt * this.scalingDuration)
      }),
    )
}
