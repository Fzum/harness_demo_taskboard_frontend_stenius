import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

/**
 * A modal question before a destructive action, with Cancel (focused first) and a confirm button;
 * the projected content says what confirming does. It opens when rendered, so the parent shows it
 * with an @if.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly confirmLabel = input('Confirm');

  /** Emits when the user confirms, just before the dialog closes. */
  readonly confirmed = output();
  /** Emits once the dialog has closed, after confirming or cancelling. */
  readonly closed = output();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.dialog().nativeElement.close();
  }
}
