/** The task model of the Taskboard backend's REST API (/api/tasks), as it sends and receives it. */

/** Where a task stands; the board has one column per status. */
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

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
}

/** Body of PUT /api/tasks/{id}: replaces every editable field, null clears one. */
export interface TaskUpdate {
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string | null;
  dueDate: string | null;
}

/** The board's columns, from left to right. */
export const TASK_STATUSES: readonly TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

export const STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

// Field limits of the host's task record (copybook TSKREC); the backend enforces them as well.

/** TSK-TITLE PIC X(40). */
export const TITLE_MAX_LENGTH = 40;

/** TSK-DESC PIC X(200). */
export const DESCRIPTION_MAX_LENGTH = 200;

/** TSK-USER PIC X(8): a user id, lower case here and upper case on the host. */
export const ASSIGNEE_PATTERN = /^[a-z][a-z0-9]{0,7}$/;

export const ASSIGNEE_HINT = 'Use a lower-case user id: a letter, then up to 7 letters or digits.';
