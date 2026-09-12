import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { PlansShowAllComponent } from './plans-show-all/plans-show-all.component'

const routes: Routes = [
  {
    // The plan type, reporting year and paging all live in query params
    // (?planType=apar&planYear=2026-27&page=1), so one route serves all three plan listings
    // and a filtered view stays shareable.
    path: '',
    component: PlansShowAllComponent,
    data: {
      pageType: 'feature',
      pageKey: 'plans',
      pageId: 'app/plans',
      module: 'Learn',
    },
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlansRoutingModule { }
