import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { TranslateService } from '@ngx-translate/core'

/**
 * "What's new" block rendered between the body text and the action buttons. Optional -
 * a dialog opened without it looks exactly as it did before.
 */
export interface IDialogHighlights {
  /** Heading for the list, passed in rather than looked up so the caller owns the i18n. */
  title?: string
  /** Release label shown beside the heading, e.g. '4.8.40'. */
  version?: string
  /** One line per user-visible change. */
  items?: string[]
}

export interface IDialogConfirmData {
  title: string
  body: string
  button?: any[]
  highlights?: IDialogHighlights
}

@Component({
    selector: 'ws-dialog-confirm',
    templateUrl: './dialog-confirm.component.html',
    styleUrls: ['./dialog-confirm.component.scss'],
    standalone: false
})
export class DialogConfirmComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: IDialogConfirmData,
    private dialogRef: MatDialogRef<DialogConfirmComponent>,
    private translate: TranslateService
  ) {
    if (localStorage.getItem('websiteLanguage')) {
      this.translate.setDefaultLang('en')
      const lang = localStorage.getItem('websiteLanguage')!
      this.translate.use(lang)
    }
  }

  /**
   * Non-blank highlight lines. Callers read these from build metadata, so an empty
   * array, a stray null or a whitespace-only entry are all expected inputs.
   */
  get highlightItems(): string[] {
    const items = this.data && this.data.highlights && this.data.highlights.items
    if (!Array.isArray(items)) {
      return []
    }
    return items
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim())
  }

  get highlightsTitle(): string {
    return (this.data && this.data.highlights && this.data.highlights.title) || ''
  }

  get highlightsVersion(): string {
    return (this.data && this.data.highlights && this.data.highlights.version) || ''
  }

  confirmed(item: any) {
    this.dialogRef.close((item !== 'no' && item !== 'cancel') ? true : false)
  }
}
