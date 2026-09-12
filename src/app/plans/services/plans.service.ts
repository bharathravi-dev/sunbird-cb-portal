import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'

const API_END_POINTS = {
  // Plan-level search. The CBPlan V3 "user dictionary" endpoint the home strips use returns
  // CONTENT (one item per content id), so it cannot back a plan listing — see
  // CardTransformerService.processPlanCards.
  SEARCH_PLANS: '/apis/proxies/v8/cbplan/v2/search',
}

/** Plan types the listing can be scoped to. Matches the mock's "Plan Type" filter. */
export type PlanTypeKey = 'apar' | 'aicbp' | 'cbp'

export interface IPlanSearchRequest {
  filter: Record<string, any>
  pageNumber: number
  pageSize: number
  searchString?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  facets: string[]
}

export interface IPlanSearchResult {
  data: any[]
  totalCount: number
  /** Raw facet map as the API sends it: { facetKey: [{ value, count }] }. */
  facets: Record<string, { value: string, count: number }[]>
}

/**
 * Facets the listing asks for. `status`, `createdByName`, `contentType`, `endDate` and
 * `isApar` are the set the Training Plans search already relies on; the organisation and
 * designation keys are requested speculatively because the mock's filter panel calls for
 * them — the panel simply omits any section the API answers with no values.
 */
export const PLAN_FACETS = [
  'status',
  'createdByName',
  'contentType',
  'isApar',
  'planYear',
  'orgIdList',
  'orgName',
  'designation',
]

@Injectable()
export class PlansService {
  private readonly http = inject(HttpClient)
  private readonly configSvc = inject(ConfigurationsService)

  /** Financial year runs April -> March, formatted YYYY-YY (e.g. Aug 2026 -> '2026-27'). */
  getCurrentFinancialYear(date: Date = new Date()): string {
    const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
    return `${startYear}-${`0${(startYear + 1) % 100}`.slice(-2)}`
  }

  /**
   * Reporting years offered in the toolbar and the filter panel: next, current, previous —
   * the three the design lists. Derived rather than configured so the list rolls over on
   * 1 April without a release. Labelling is the caller's job, since the "(Current R.Y.)"
   * suffix is translated.
   */
  getPlanYearOptions(): { value: string, isCurrent: boolean }[] {
    const startYear = Number(this.getCurrentFinancialYear().split('-')[0])
    // July keeps the constructed date inside the financial year regardless of timezone.
    return [1, 0, -1].map(offset => ({
      value: this.getCurrentFinancialYear(new Date(startYear + offset, 6, 1)),
      isCurrent: offset === 0,
    }))
  }

  search(request: IPlanSearchRequest): Observable<IPlanSearchResult> {
    const body: IPlanSearchRequest = {
      ...request,
      filter: {
        ...request.filter,
        // Scope to the signed-in user's org, exactly as the Training Plans search does.
        orgIdList: [this.configSvc.userProfile?.rootOrgId].filter(Boolean),
      },
    }

    return this.http.post(API_END_POINTS.SEARCH_PLANS, body).pipe(
      map((res: any) => {
        // The endpoint double-nests: { result: { result: { data, totalCount, facets } } }.
        const inner = res?.result?.result ?? res?.result ?? {}
        return {
          data: Array.isArray(inner.data) ? inner.data : [],
          totalCount: Number(inner.totalCount) || 0,
          facets: inner.facets && typeof inner.facets === 'object' ? inner.facets : {},
        }
      }),
      // A listing that renders "no plans" beats one that renders a stack trace.
      catchError(() => of({ data: [], totalCount: 0, facets: {} })),
    )
  }
}
