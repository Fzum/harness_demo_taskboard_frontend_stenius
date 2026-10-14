import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { Board } from './board/board';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog';
import { TaskForm } from './task-form/task-form';
import { Task } from './tasks/task';
import { TaskStore } from './tasks/task-store';

/** How often the board reloads, so that host tasks and sync status changes appear by themselves. */
export const REFRESH_INTERVAL_MS = 10_000;

/**
 * The Taskboard page: toolbar, banners, the board and the dialogs it opens. It connects the
 * store to the presentational components.
 */
@Component({
  selector: 'app-root',
  imports: [Board, ConfirmDialog, DatePipe, TaskForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(TaskStore);
  protected readonly refreshSeconds = REFRESH_INTERVAL_MS / 1000;

  /** The open task form, for the task to edit or for a new task (null); null when closed. */
  protected readonly editor = signal<{ task: Task | null } | null>(null);
  /** The task whose deletion waits for the user's confirmation. */
  protected readonly deleting = signal<Task | null>(null);

  constructor() {
    this.store.refresh();
    interval(REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.store.refresh());
  }

  protected openEditor(task: Task | null): void {
    this.editor.set({ task });
  }
}
