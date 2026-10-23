import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  FormRoot,
  maxLength,
  pattern,
  ReadonlyFieldTree,
  required,
  schema,
  ValidationError,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { problemDetailsOf, reasonOf } from '../tasks/problem-details';
import {
  ASSIGNEE_HINT,
  ASSIGNEE_PATTERN,
  DESCRIPTION_MAX_LENGTH,
  PRIORITY_LABELS,
  STATUS_LABELS,
  Task,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
  TITLE_MAX_LENGTH,
} from '../tasks/task';
import { TaskStore } from '../tasks/task-store';

/** The form's fields; empty strings stand for the API's nulls. */
interface TaskFormModel {
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
}

/** The field limits of the host record, so that the backend has no reason to reject a task. */
const taskSchema = schema<TaskFormModel>((task) => {
  // required() takes "   " for a title; the pattern does not.
  required(task.title, { message: 'Enter a title.' });
  pattern(task.title, /\S/, { message: 'Enter a title.' });
  maxLength(task.title, TITLE_MAX_LENGTH, {
    message: `Use at most ${TITLE_MAX_LENGTH} characters.`,
  });
  maxLength(task.description, DESCRIPTION_MAX_LENGTH, {
    message: `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`,
  });
  pattern(task.assignee, ASSIGNEE_PATTERN, { message: ASSIGNEE_HINT });
});

/**
 * The dialog that creates a task or edits one. It opens when rendered, saves through the store and
 * shows the server's validation errors on the fields they are about.
 */
@Component({
  selector: 'app-task-form',
  imports: [FormField, FormRoot],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  private readonly store = inject(TaskStore);

  /** The task to edit, or null to create one. */
  readonly task = input<Task | null>(null);
  /** User ids to suggest as the assignee. */
  readonly assignees = input<readonly string[]>([]);

  /** Emits once the dialog has closed, after saving or cancelling. */
  readonly closed = output();

  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly statuses = TASK_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
  }));

  protected readonly priorities = TASK_PRIORITIES.map((priority) => ({
    priority,
    label: PRIORITY_LABELS[priority],
  }));

  private readonly model = linkedSignal<TaskFormModel>(() => {
    const task = this.task();
    return {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'OPEN',
      assignee: task?.assignee ?? '',
      dueDate: task?.dueDate ?? '',
      priority: task?.priority ?? 'MEDIUM',
    };
  });
  protected readonly taskForm = form(this.model, taskSchema, {
    submission: {
      action: () => this.save(),
      // Takes the user, and a screen reader, to the first field to correct.
      onInvalid: (task) => task().errorSummary()[0]?.fieldTree().focusBoundControl(),
    },
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  /** The message under a field: its first error, once the user has left it or submitted. */
  protected errorOf<T>(field: FieldTree<T>): string | null {
    const state = field();
    return state.touched() ? (state.errors()[0]?.message ?? null) : null;
  }

  /** The form's submit action: saves the task, then closes, or returns the server's errors. */
  private async save(): Promise<ValidationError.WithOptionalFieldTree[] | undefined> {
    const value = this.model();
    const fields = {
      title: value.title.trim(),
      description: value.description.trim() || null,
      assignee: value.assignee || null,
      dueDate: value.dueDate || null,
      priority: value.priority,
    };
    const task = this.task();
    const saved = task
      ? this.store.update(task.id, { ...fields, status: value.status })
      : this.store.create(fields);
    try {
      await firstValueFrom(saved);
    } catch (error) {
      return this.serverErrors(error);
    }
    this.dialog().nativeElement.close();
    return undefined;
  }

  /** The backend's validation errors on their fields; anything else on the form as a whole. */
  private serverErrors(error: unknown): ValidationError.WithOptionalFieldTree[] {
    const fields: Partial<Record<string, ReadonlyFieldTree<unknown>>> = {
      title: this.taskForm.title,
      description: this.taskForm.description,
      status: this.taskForm.status,
      assignee: this.taskForm.assignee,
      dueDate: this.taskForm.dueDate,
      priority: this.taskForm.priority,
    };
    const fieldErrors = Object.entries(problemDetailsOf(error)?.errors ?? {}).map(
      ([name, message]) => {
        const fieldTree = fields[name];
        return { kind: 'server', message: fieldTree ? message : `${name}: ${message}`, fieldTree };
      },
    );
    return fieldErrors.length > 0
      ? fieldErrors
      : [{ kind: 'server', message: `The task could not be saved: ${reasonOf(error)}` }];
  }
}
