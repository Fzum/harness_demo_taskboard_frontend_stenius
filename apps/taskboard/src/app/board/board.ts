import { Component, computed, input, output } from '@angular/core';

import { TaskCard } from '../task-card/task-card';
import { STATUS_LABELS, Task, TASK_STATUSES, TaskStatus } from '../tasks/task';

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
 * are no tasks at all. Presentational: it passes the cards' actions on, naming the task.
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
      tasks: this.tasks().filter((task) => task.status === status),
    })),
  );
}
