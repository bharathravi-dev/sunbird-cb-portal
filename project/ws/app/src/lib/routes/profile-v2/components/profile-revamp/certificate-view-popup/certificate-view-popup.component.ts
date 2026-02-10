import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'ws-app-certificate-view-popup',
  templateUrl: './certificate-view-popup.component.html',
  styleUrls: ['./certificate-view-popup.component.scss']
})
export class CertificateViewPopupComponent implements OnInit{
  certificateUrl = '';

  constructor(private dialogRef: MatDialogRef<CertificateViewPopupComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
      }

  ngOnInit(): void {
    if (this.data && this.data.certificateUrl) {
      this.certificateUrl = this.data.certificateUrl;
    }
  }

  closePopup() {
    this.dialogRef.close();
  }

}
