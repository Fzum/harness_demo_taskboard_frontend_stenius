import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, FormRoot, pattern, required } from '@angular/forms/signals';

import { ASSIGNEE_HINT, ASSIGNEE_PATTERN } from '../tasks/task';

let nextId = 0;

/**
 * The assign quick action of a task card: one click on a suggested user id, any other valid user
 * id, or unassign. The user id field gets the focus when the picker opens.
 */
@Component({
  selector: 'app-assignee-picker',
  imports: [FormField, FormRoot],
  templateUrl: './assignee-picker.html',
  styleUrl: './assignee-picker.scss',
})
export class AssigneePicker {
  /** The task's current assignee, or null. */
  readonly assignee = input<string | null>(null);
  /** User ids to offer with one click, typically the assignees already on the board. */
  readonly suggestions = input<readonly string[]>([]);

  /** Emits the chosen user id, or null to unassign. */
  readonly picked = output<string | null>();

  protected readonly id = `assignee-picker-${nextId++}`;
  protected readonly others = computed(() =>
    this.suggestions().filter((user) => user !== this.assignee()),
  );

  private readonly model = signal({ userId: '' });
  protected readonly userForm = form(
    this.model,
    (path) => {
      required(path.userId, { message: 'Enter a user id.' });
      pattern(path.userId, ASSIGNEE_PATTERN, { message: ASSIGNEE_HINT });
    },
    { submission: { action: async () => this.picked.emit(this.model().userId) } },
  );

  /** The user id field's first error, once the user has left the field or submitted. */
  protected readonly error = computed(() => {
    const field = this.userForm.userId();
    return field.touched() ? (field.errors()[0]?.message ?? null) : null;
  });

  private readonly userIdInput = viewChild.required<ElementRef<HTMLInputElement>>('userIdInput');

  constructor() {
    afterNextRender(() => this.userIdInput().nativeElement.focus());
  }
}
