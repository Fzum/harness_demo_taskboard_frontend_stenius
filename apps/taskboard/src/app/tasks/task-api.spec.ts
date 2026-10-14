import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { aTask } from '../../testing/tasks';
import { problemDetailsOf } from './problem-details';
import { Task } from './task';
import { TaskApi } from './task-api';

describe('TaskApi', () => {
  let api: TaskApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TaskApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists all tasks with GET /api/tasks', () => {
    const tasks = [aTask({ id: 1 }), aTask({ id: 2, source: 'HOST', hostId: 'H000001001' })];
    let listed: Task[] | undefined;

    api.list().subscribe((result) => (listed = result));
    http.expectOne({ method: 'GET', url: '/api/tasks' }).flush(tasks);

    expect(listed).toEqual(tasks);
  });

  it('reads one task with GET /api/tasks/{id}', () => {
    let read: Task | undefined;

    api.get(42).subscribe((result) => (read = result));
    http.expectOne({ method: 'GET', url: '/api/tasks/42' }).flush(aTask());

    expect(read).toEqual(aTask());
  });

  it('creates a task with POST /api/tasks', () => {
    const newTask = {
      title: 'Clarify returned direct debit',
      description: 'The bank returned the October instalment',
      assignee: 'amueller',
      dueDate: '2026-10-31',
    };
    let created: Task | undefined;

    api.create(newTask).subscribe((result) => (created = result));
    const request = http.expectOne({ method: 'POST', url: '/api/tasks' });
    request.flush(aTask(), {
      status: 201,
      statusText: 'Created',
      headers: { Location: '/api/tasks/42' },
    });

    expect(request.request.body).toStrictEqual(newTask);
    expect(created).toEqual(aTask());
  });

  it('replaces the editable fields with PUT /api/tasks/{id}, null clearing a field', () => {
    const update = {
      title: 'Clarify returned direct debit',
      description: null,
      status: 'IN_PROGRESS' as const,
      assignee: null,
      dueDate: null,
    };

    api.update(42, update).subscribe();
    const request = http.expectOne({ method: 'PUT', url: '/api/tasks/42' });
    request.flush(aTask({ ...update, syncStatus: 'PENDING' }));

    expect(request.request.body).toStrictEqual(update);
  });

  it('assigns a task with PUT /api/tasks/{id}/assignee', () => {
    api.assign(42, 'bweber').subscribe();
    const request = http.expectOne({ method: 'PUT', url: '/api/tasks/42/assignee' });
    request.flush(aTask({ assignee: 'bweber' }));

    expect(request.request.body).toStrictEqual({ assignee: 'bweber' });
  });

  it('unassigns a task by sending a null assignee', () => {
    api.assign(42, null).subscribe();
    const request = http.expectOne({ method: 'PUT', url: '/api/tasks/42/assignee' });
    request.flush(aTask({ assignee: null }));

    expect(request.request.body).toStrictEqual({ assignee: null });
  });

  it('deletes a task with DELETE /api/tasks/{id}', () => {
    let completed = false;

    api.delete(42).subscribe({ complete: () => (completed = true) });
    http
      .expectOne({ method: 'DELETE', url: '/api/tasks/42' })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('fails with the problem details of an error response', () => {
    const problem = {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid request content.',
      errors: { title: 'must not be blank' },
    };
    let failure: unknown;

    api.create({ title: ' ' }).subscribe({ error: (error: unknown) => (failure = error) });
    http
      .expectOne({ method: 'POST', url: '/api/tasks' })
      .flush(problem, { status: 400, statusText: 'Bad Request' });

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(problemDetailsOf(failure)).toEqual(problem);
  });
});
