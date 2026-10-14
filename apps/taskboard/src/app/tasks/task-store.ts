import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';

import { reasonOf } from './problem-details';
import { NewTask, STATUS_LABELS, Task, TaskStatus, TaskUpdate } from './task';
import { TaskApi } from './task-api';

interface TaskState {
  /** The tasks as the backend last reported them, sorted by id. */
  tasks: readonly Task[];
  /** Whether a refresh has succeeded yet; until then there is no board to show. */
  loaded: boolean;
  /** Whether the latest refresh failed. */
  unreachable: boolean;
  lastRefresh: Date | null;
  /** Why the latest quick action failed, until the user dismisses it. */
  error: string | null;
}

/**
 * The board's state, as signals. Components read it and call the methods below; only the store
 * talks to the API. It applies a change once the backend has confirmed it, never optimistically.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly api = inject(TaskApi);
  private readonly state = signal<TaskState>({
    tasks: [],
    loaded: false,
    unreachable: false,
    lastRefresh: null,
    error: null,
  });
  private refreshing?: Subscription;

  readonly tasks = computed(() => this.state().tasks);
  readonly loaded = computed(() => this.state().loaded);
  readonly unreachable = computed(() => this.state().unreachable);
  readonly lastRefresh = computed(() => this.state().lastRefresh);
  readonly error = computed(() => this.state().error);

  /** The user ids the tasks are assigned to, sorted: the suggestions when assigning a task. */
  readonly assignees = computed(() =>
    [...new Set(this.tasks().flatMap((task) => task.assignee ?? []))].sort(),
  );

  /**
   * Reloads every task, dropping a refresh still in flight. If it fails, the board keeps the last
   * known tasks and is marked unreachable until a refresh succeeds again.
   */
  refresh(): void {
    this.refreshing?.unsubscribe();
    this.refreshing = this.api.list().subscribe({
      next: (tasks) =>
        this.patch({ tasks, loaded: true, unreachable: false, lastRefresh: new Date() }),
      error: () => this.patch({ unreachable: true }),
    });
  }

  /** Creates a task. Errors go to the subscriber, which shows the server's validation errors. */
  create(task: NewTask): Observable<Task> {
    return this.api.create(task).pipe(tap((created) => this.upsert(created)));
  }

  /** Replaces a task's editable fields. Errors go to the subscriber. */
  update(id: number, update: TaskUpdate): Observable<Task> {
    return this.api.update(id, update).pipe(tap((updated) => this.upsert(updated)));
  }

  move(task: Task, status: TaskStatus): void {
    const { title, description, assignee, dueDate } = task;
    this.api.update(task.id, { title, description, status, assignee, dueDate }).subscribe({
      next: (moved) => this.upsert(moved),
      error: (error: unknown) =>
        this.fail(`Could not move "${task.title}" to ${STATUS_LABELS[status]}`, error),
    });
  }

  /** Assigns the task to a user, or unassigns it with null. */
  assign(task: Task, assignee: string | null): void {
    this.api.assign(task.id, assignee).subscribe({
      next: (assigned) => this.upsert(assigned),
      error: (error: unknown) =>
        this.fail(
          assignee
            ? `Could not assign "${task.title}" to ${assignee}`
            : `Could not unassign "${task.title}"`,
          error,
        ),
    });
  }

  delete(task: Task): void {
    this.api.delete(task.id).subscribe({
      next: () => this.apply((tasks) => tasks.filter(({ id }) => id !== task.id)),
      error: (error: unknown) => this.fail(`Could not delete "${task.title}"`, error),
    });
  }

  dismissError(): void {
    this.patch({ error: null });
  }

  private upsert(task: Task): void {
    this.apply((tasks) =>
      tasks.some(({ id }) => id === task.id)
        ? tasks.map((known) => (known.id === task.id ? task : known))
        : [...tasks, task],
    );
  }

  /** Applies a confirmed change. A refresh still in flight may predate it, so it is dropped. */
  private apply(change: (tasks: readonly Task[]) => readonly Task[]): void {
    this.refreshing?.unsubscribe();
    this.state.update((state) => ({ ...state, tasks: change(state.tasks) }));
  }

  /** Reports a failed quick action and reloads the board, which may have changed meanwhile. */
  private fail(action: string, error: unknown): void {
    this.patch({ error: `${action}: ${reasonOf(error)}` });
    this.refresh();
  }

  private patch(changes: Partial<TaskState>): void {
    this.state.update((state) => ({ ...state, ...changes }));
  }
}
