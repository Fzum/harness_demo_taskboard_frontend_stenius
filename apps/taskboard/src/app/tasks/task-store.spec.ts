import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { aTask, boardTasks } from '../../testing/tasks';
import { Task } from './task';
import { TaskStore } from './task-store';

describe('TaskStore', () => {
  const [hostTask, , unassignedTask] = boardTasks;
  let store: TaskStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(TaskStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function load(tasks: Task[] = boardTasks): void {
    store.refresh();
    http.expectOne({ method: 'GET', url: '/api/tasks' }).flush(tasks);
  }

  it('has nothing to show before the first refresh', () => {
    expect(store.loaded()).toBe(false);
    expect(store.tasks()).toEqual([]);
    expect(store.lastRefresh()).toBeNull();
  });

  it('loads every task on refresh and notes when', () => {
    load();

    expect(store.loaded()).toBe(true);
    expect(store.tasks()).toEqual(boardTasks);
    expect(store.lastRefresh()).toBeInstanceOf(Date);
    expect(store.unreachable()).toBe(false);
  });

  it('keeps the last known tasks while the backend is unreachable, until a refresh succeeds', () => {
    load();

    store.refresh();
    http.expectOne('/api/tasks').error(new ProgressEvent('error'));

    expect(store.unreachable()).toBe(true);
    expect(store.tasks()).toEqual(boardTasks);

    load([hostTask]);

    expect(store.unreachable()).toBe(false);
    expect(store.tasks()).toEqual([hostTask]);
  });

  it('drops a refresh still in flight when the next one starts', () => {
    store.refresh();
    const first = http.expectOne('/api/tasks');

    load();

    expect(first.cancelled).toBe(true);
  });

  it('suggests the assignees on the board, each once and sorted', () => {
    load([...boardTasks, aTask({ id: 5, assignee: 'bweber' })]);

    expect(store.assignees()).toEqual(['amueller', 'bweber', 'ckoch']);
  });

  it('adds a created task once the backend has confirmed it', () => {
    load();
    const created = aTask({ id: 5, title: 'Request missing signature' });

    store.create({ title: 'Request missing signature' }).subscribe();
    const request = http.expectOne({ method: 'POST', url: '/api/tasks' });
    expect(store.tasks()).toHaveLength(boardTasks.length);
    request.flush(created);

    expect(store.tasks().at(-1)).toEqual(created);
  });

  it('replaces an updated task with the version the backend returns', () => {
    load();
    const updated = {
      ...hostTask,
      title: 'Check address change of October',
      syncStatus: 'PENDING',
    };

    store
      .update(hostTask.id, {
        title: 'Check address change of October',
        description: hostTask.description,
        status: 'OPEN',
        assignee: hostTask.assignee,
        dueDate: hostTask.dueDate,
      })
      .subscribe();
    http.expectOne({ method: 'PUT', url: '/api/tasks/1' }).flush(updated);

    expect(store.tasks()[0]).toEqual(updated);
  });

  it('moves a task by replacing its editable fields, with the new status', () => {
    load();

    store.move(hostTask, 'IN_PROGRESS');
    const request = http.expectOne({ method: 'PUT', url: '/api/tasks/1' });
    request.flush({ ...hostTask, status: 'IN_PROGRESS', syncStatus: 'PENDING' });

    expect(request.request.body).toStrictEqual({
      title: 'Check address change',
      description: 'Customer moved; the host still has the old address',
      status: 'IN_PROGRESS',
      assignee: 'bweber',
      dueDate: '2026-10-20',
    });
    expect(store.tasks()[0].status).toBe('IN_PROGRESS');
    expect(store.tasks()[0].syncStatus).toBe('PENDING');
  });

  it('assigns and unassigns a task', () => {
    load();

    store.assign(unassignedTask, 'ckoch');
    const assign = http.expectOne({ method: 'PUT', url: '/api/tasks/3/assignee' });
    assign.flush({ ...unassignedTask, assignee: 'ckoch' });
    expect(assign.request.body).toStrictEqual({ assignee: 'ckoch' });
    expect(store.tasks()[2].assignee).toBe('ckoch');

    store.assign(store.tasks()[2], null);
    const unassign = http.expectOne({ method: 'PUT', url: '/api/tasks/3/assignee' });
    unassign.flush({ ...unassignedTask, assignee: null });
    expect(unassign.request.body).toStrictEqual({ assignee: null });
    expect(store.tasks()[2].assignee).toBeNull();
  });

  it('removes a deleted task', () => {
    load();

    store.delete(hostTask);
    http
      .expectOne({ method: 'DELETE', url: '/api/tasks/1' })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(store.tasks().map(({ id }) => id)).toEqual([2, 3, 4]);
  });

  it('drops a refresh in flight when a change lands, so that it cannot undo the change', () => {
    load();
    store.refresh();
    const refresh = http.expectOne('/api/tasks');

    store.move(hostTask, 'DONE');
    http.expectOne({ method: 'PUT', url: '/api/tasks/1' }).flush({ ...hostTask, status: 'DONE' });

    expect(refresh.cancelled).toBe(true);
    expect(store.tasks()[0].status).toBe('DONE');
  });

  it('reports a failed action with the problem detail and reloads the board', () => {
    load();

    store.delete(hostTask);
    http
      .expectOne({ method: 'DELETE', url: '/api/tasks/1' })
      .flush(
        { title: 'Not Found', status: 404, detail: 'Task 1 does not exist' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(store.error()).toBe('Could not delete "Check address change": Task 1 does not exist');
    http.expectOne({ method: 'GET', url: '/api/tasks' }).flush(boardTasks.slice(1));
    expect(store.tasks()).toHaveLength(3);

    store.dismissError();
    expect(store.error()).toBeNull();
  });

  it('says so when an action fails because the backend is unreachable', () => {
    load();

    store.assign(unassignedTask, 'amueller');
    http
      .expectOne({ method: 'PUT', url: '/api/tasks/3/assignee' })
      .error(new ProgressEvent('error'));
    http.expectOne('/api/tasks').error(new ProgressEvent('error'));

    expect(store.error()).toBe(
      'Could not assign "Archive closed case file" to amueller: the backend is unreachable',
    );
    expect(store.unreachable()).toBe(true);
  });

  it('takes a bad gateway, as the dev server answers while the backend is down, as unreachable', () => {
    load();

    store.move(unassignedTask, 'DONE');
    http
      .expectOne({ method: 'PUT', url: '/api/tasks/3' })
      .flush('', { status: 502, statusText: 'Bad Gateway' });
    http.expectOne('/api/tasks').flush('', { status: 502, statusText: 'Bad Gateway' });

    expect(store.error()).toBe(
      'Could not move "Archive closed case file" to Done: the backend is unreachable',
    );
    expect(store.unreachable()).toBe(true);
  });

  it('names the status of an error response without problem details', () => {
    load();

    store.delete(unassignedTask);
    http
      .expectOne({ method: 'DELETE', url: '/api/tasks/3' })
      .flush('', { status: 500, statusText: 'Internal Server Error' });
    http.expectOne({ method: 'GET', url: '/api/tasks' }).flush(boardTasks);

    expect(store.error()).toBe(
      'Could not delete "Archive closed case file": the backend answered with status 500',
    );
  });
});
