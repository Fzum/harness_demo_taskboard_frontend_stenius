import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  inject,
  input,
  output,
  viewChildren,
} from '@angular/core';

import { TaskCard } from '../task-card/task-card';
import { sortTasks, STATUS_LABELS, Task, TASK_STATUSES, TaskStatus } from '../tasks/task';

export interface TaskMove {
  task: Task;
  status: TaskStatus;
}

export interface TaskAssignment {
  task: Task;
  /** The new assignee, or null to unassign. */
  assignee: string | null;
}

/**
 * The board: a column per status with the number of tasks in it, or an empty state when there
 * are no tasks at all. Presentational: it passes the cards' actions on, naming the task, and keeps
 * the focus on a task that changes columns.
 */
@Component({
  selector: 'app-board',
  imports: [TaskCard],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  readonly tasks = input.required<readonly Task[]>();
  /** User ids to suggest when assigning. */
  readonly assignees = input<readonly string[]>([]);

  /** The empty state's call to action. */
  readonly create = output();
  readonly edit = output<Task>();
  readonly move = output<TaskMove>();
  readonly assign = output<TaskAssignment>();
  readonly delete = output<Task>();

  protected readonly columns = computed(() =>
    TASK_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      tasks: sortTasks(this.tasks().filter((task) => task.status === status)),
    })),
  );

  private readonly document = inject(DOCUMENT);
  private readonly cards = viewChildren(TaskCard);
  /** The card the focus was in last, and its task. */
  private focused: { card: TaskCard; taskId: number } | null = null;

  constructor() {
    // A task that changes columns, by a move, an edit or a refresh, gets a new card there, and the
    // focus in its old card falls back to the page. Hand it on to the new card.
    afterRenderEffect(() => {
      const cards = this.cards();
      const last = this.focused;
      if (!last || cards.includes(last.card)) {
        return;
      }
      this.focused = null;
      const successor = cards.find((card) => card.task().id === last.taskId);
      if (successor && this.document.activeElement === this.document.body) {
        successor.focus();
      }
    });
  }

  protected noteFocus(card: TaskCard): void {
    this.focused = { card, taskId: card.task().id };
  }
}
