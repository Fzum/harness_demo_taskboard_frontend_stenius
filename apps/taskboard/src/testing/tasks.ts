import type { Task } from '../app/tasks/task';

/** A task as the backend returns it (the contract's example); override what a test cares about. */
export function aTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 42,
    title: 'Clarify returned direct debit',
    description: 'The bank returned the October instalment',
    status: 'OPEN',
    assignee: 'amueller',
    dueDate: '2026-10-31',
    priority: 'MEDIUM',
    source: 'TASKBOARD',
    hostId: null,
    syncStatus: 'PENDING',
    createdAt: '2026-10-14T08:15:30.123Z',
    updatedAt: '2026-10-14T08:15:30.123Z',
    ...overrides,
  };
}

/** A small board: tasks in every column, from both sources and in every sync status. */
export const boardTasks: Task[] = [
  aTask({
    id: 1,
    title: 'Check address change',
    description: 'Customer moved; the host still has the old address',
    assignee: 'bweber',
    dueDate: '2026-10-20',
    source: 'HOST',
    hostId: 'H000001001',
    syncStatus: 'SYNCED',
  }),
  aTask({
    id: 2,
    title: 'Send payment reminder',
    description: null,
    status: 'IN_PROGRESS',
    assignee: 'amueller',
    dueDate: null,
    hostId: 'T000000002',
    syncStatus: 'SYNCED',
  }),
  aTask({
    id: 3,
    title: 'Archive closed case file',
    description: 'Scan the paper file before it goes to the archive',
    assignee: null,
    dueDate: null,
    syncStatus: 'PENDING',
  }),
  aTask({
    id: 4,
    title: 'Correct duplicate booking',
    description: 'Booked twice on the host; cancel the second one',
    status: 'DONE',
    assignee: 'ckoch',
    dueDate: '2026-10-01',
    source: 'HOST',
    hostId: 'H000001002',
    syncStatus: 'FAILED',
  }),
];
