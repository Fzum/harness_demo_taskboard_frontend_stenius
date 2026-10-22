/** The task model of the Taskboard backend's REST API (/api/tasks), as it sends and receives it. */

/** Where a task stands; the board has one column per status. */
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

/** How urgent a task is; the host keeps it as TSK-PRIO (H, M, L). */
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/** Where a task was created: in the Taskboard or on the IBM host. */
export type TaskSource = 'TASKBOARD' | 'HOST';

/**
 * Whether the host has the task's latest change, after the status of the task's latest outbox
 * event: PENDING until the datasync has written the change to the host, SYNCED once it has (or
 * when the task came from the host and is unchanged), FAILED when the datasync gave up on it.
 */
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** Lower-case user id, or null when nobody is assigned. */
  assignee: string | null;
  /** ISO local date, for example "2026-10-31". */
  dueDate: string | null;
  /** Never null: tasks without a priority report MEDIUM. */
  priority: TaskPriority;
  source: TaskSource;
  /** The task's key on the host (TSK-ID), for example "H000001001"; null until the host has it. */
  hostId: string | null;
  syncStatus: SyncStatus;
  /** ISO-8601 UTC instant. */
  createdAt: string;
  /** ISO-8601 UTC instant. */
  updatedAt: string;
}

/** Body of POST /api/tasks. A new task is OPEN and its source is TASKBOARD. */
export interface NewTask {
  title: string;
  description?: string | null;
  assignee?: string | null;
  dueDate?: string | null;
  /** The backend takes MEDIUM when omitted. */
  priority?: TaskPriority;
}

/** Body of PUT /api/tasks/{id}: replaces every editable field, null clears one. */
export interface TaskUpdate {
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string | null;
  dueDate: string | null;
  /** The backend keeps the current priority when omitted. */
  priority?: TaskPriority;
}

/** The board's columns, from left to right. */
export const TASK_STATUSES: readonly TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

export const STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

/** Priorities in the order of the form's select and of a column: most urgent first. */
export const TASK_PRIORITIES: readonly TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

/**
 * The order of a column: priority (high first), then due date (earliest first, none last), then
 * id. Returns a sorted copy.
 */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority) ||
      compareDueDates(a.dueDate, b.dueDate) ||
      a.id - b.id,
  );
}

function compareDueDates(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a < b ? -1 : 1;
}

// Field limits of the host's task record (copybook TSKREC); the backend enforces them as well.

/** TSK-TITLE PIC X(40). */
export const TITLE_MAX_LENGTH = 40;

/** TSK-DESC PIC X(200). */
export const DESCRIPTION_MAX_LENGTH = 200;

/** TSK-USER PIC X(8): a user id, lower case here and upper case on the host. */
export const ASSIGNEE_PATTERN = /^[a-z][a-z0-9]{0,7}$/;

export const ASSIGNEE_HINT = 'Use a lower-case user id: a letter, then up to 7 letters or digits.';
