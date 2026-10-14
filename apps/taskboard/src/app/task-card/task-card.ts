import { DatePipe, formatDate } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

import { AssigneePicker } from '../assignee-picker/assignee-picker';
import { STATUS_LABELS, SyncStatus, Task, TASK_STATUSES, TaskStatus } from '../tasks/task';

interface Badge {
  text: string;
  tooltip: string;
}

/** What the sync badge says about whether the host has the task's latest change. */
const SYNC_BADGES: Readonly<Record<SyncStatus, Badge>> = {
  PENDING: {
    text: 'Pending host sync',
    tooltip:
      'Saved in the Taskboard. The datasync writes the change to the host within 30 seconds.',
  },
  SYNCED: {
    text: 'In sync with host',
    tooltip: 'The host has the latest version of this task.',
  },
  FAILED: {
    text: 'Host inconsistency',
    tooltip:
      'The datasync could not write the latest change to the host, which keeps an older ' +
      'version until an operator retries the change.',
  },
};

/** One task on the board, with its quick actions. Presentational: it only emits what to do. */
@Component({
  selector: 'app-task-card',
  imports: [AssigneePicker, DatePipe],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  readonly task = input.required<Task>();
  /** User ids to suggest when assigning, typically the assignees already on the board. */
  readonly assignees = input<readonly string[]>([]);

  readonly edit = output();
  readonly move = output<TaskStatus>();
  /** Emits the new assignee, or null to unassign. */
  readonly assign = output<string | null>();
  readonly delete = output();

  /** Whether the assignee picker is open. */
  protected readonly picking = signal(false);

  /** Element ids, unique on the board because every task appears once. */
  protected readonly ids = computed(() => {
    const prefix = `task-${this.task().id}`;
    return {
      title: `${prefix}-title`,
      source: `${prefix}-source`,
      sync: `${prefix}-sync`,
      picker: `${prefix}-assign`,
    };
  });

  protected readonly source = computed<Badge>(() => {
    const { source, hostId } = this.task();
    if (source === 'HOST') {
      return { text: 'Host', tooltip: 'Created on the IBM host and loaded by the datasync.' };
    }
    return {
      text: 'Taskboard',
      tooltip: hostId
        ? `Created in the Taskboard. The host knows it as ${hostId}.`
        : 'Created in the Taskboard. The host does not have it yet.',
    };
  });

  protected readonly sync = computed(() => SYNC_BADGES[this.task().syncStatus]);

  /** Due before today and not done yet. */
  protected readonly overdue = computed(() => {
    const { dueDate, status } = this.task();
    return status !== 'DONE' && dueDate !== null && dueDate < today();
  });

  /** The other columns, each with whether it lies to the left of the task's column. */
  protected readonly moves = computed(() => {
    const current = TASK_STATUSES.indexOf(this.task().status);
    return TASK_STATUSES.flatMap((status, index) =>
      index === current ? [] : [{ status, label: STATUS_LABELS[status], back: index < current }],
    );
  });

  protected pick(assignee: string | null): void {
    this.picking.set(false);
    this.assign.emit(assignee);
  }
}

/** Today in the browser's time zone, as an ISO local date like a task's dueDate. */
function today(): string {
  return formatDate(Date.now(), 'yyyy-MM-dd', 'en-US');
}
