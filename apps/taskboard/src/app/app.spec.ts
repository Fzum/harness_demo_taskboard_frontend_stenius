import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { button, find, settle, textOf, texts, typeInto } from '../testing/dom';
import { aTask, boardTasks } from '../testing/tasks';
import { App, REFRESH_INTERVAL_MS } from './app';
import { Task } from './tasks/task';

describe('App', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<App>;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function render(): void {
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    page = fixture.nativeElement;
  }

  /** Answers the board's pending refresh with these tasks. */
  function answerRefresh(tasks: Task[] = boardTasks): void {
    http.expectOne({ method: 'GET', url: '/api/tasks' }).flush(tasks);
    fixture.detectChanges();
  }

  function failRefresh(): void {
    http.expectOne({ method: 'GET', url: '/api/tasks' }).error(new ProgressEvent('error'));
    fixture.detectChanges();
  }

  function cardOf(title: string): HTMLElement {
    const card = Array.from(page.querySelectorAll<HTMLElement>('app-task-card')).find(
      (each) => textOf(find(each, '.card__title')) === title,
    );
    if (!card) {
      throw new Error(`No card for "${title}"`);
    }
    return card;
  }

  function titlesIn(status: string): string[] {
    return texts(find(page, `.column[data-status="${status}"]`), '.card__title');
  }

  it('loads the tasks and shows them on the board', () => {
    render();
    expect(texts(page, '[role="status"]')).toEqual(['Loading tasks…']);

    answerRefresh();

    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(titlesIn('OPEN')).toEqual(['Check address change', 'Archive closed case file']);
    expect(titlesIn('IN_PROGRESS')).toEqual(['Send payment reminder']);
    expect(titlesIn('DONE')).toEqual(['Correct duplicate booking']);
    expect(textOf(find(page, '.topbar__updated'))).toMatch(/^Updated \d{1,2}:\d{2}:\d{2} [AP]M$/);
  });

  it('refreshes every 10 seconds, so that host tasks and sync changes appear by themselves', () => {
    vi.useFakeTimers();
    render();
    answerRefresh([aTask({ syncStatus: 'PENDING' })]);
    expect(texts(page, '.card__sync')).toEqual(['Pending host sync']);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    answerRefresh([aTask({ syncStatus: 'SYNCED', hostId: 'T000000042' }), ...boardTasks]);

    expect(texts(page, '.card__sync')[0]).toBe('In sync with host');
    expect(texts(page, '.card__title')).toHaveLength(5);
  });

  it('refreshes on demand', () => {
    render();
    answerRefresh([]);

    button(page, 'Refresh').click();
    answerRefresh();

    expect(texts(page, '.card__title')).toHaveLength(4);
  });

  it('shows an empty state when there are no tasks', () => {
    render();
    answerRefresh([]);

    expect(texts(page, '.empty__heading')).toEqual(['No tasks yet']);
  });

  it('shows a banner while the backend is unreachable and keeps the last known board', () => {
    render();
    answerRefresh();

    button(page, 'Refresh').click();
    failRefresh();

    expect(texts(page, '[role="alert"]')).toEqual([
      'The Taskboard backend is unreachable. The board shows the last known state and retries ' +
        'every 10 seconds. Retry now',
    ]);
    expect(texts(page, '.card__title')).toHaveLength(4);

    button(page, 'Retry now').click();
    answerRefresh();

    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('says so when the backend is unreachable from the start', () => {
    render();
    failRefresh();

    expect(texts(page, '[role="alert"]')).toEqual([
      'The Taskboard backend is unreachable. The board appears once it answers; it retries every ' +
        '10 seconds. Retry now',
    ]);
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('app-board')).toBeNull();
  });

  it('creates a task in the dialog and shows it on the board', async () => {
    render();
    answerRefresh();

    button(page, 'New task').click();
    fixture.detectChanges();
    const form = find(page, 'app-task-form');
    expect(find<HTMLDialogElement>(form, 'dialog').open).toBe(true);

    typeInto(form, '#task-title', 'Request missing signature');
    button(form, 'Create task').click();
    http
      .expectOne({ method: 'POST', url: '/api/tasks' })
      .flush(aTask({ id: 5, title: 'Request missing signature', assignee: null }), {
        status: 201,
        statusText: 'Created',
      });
    await settle(fixture);

    expect(page.querySelector('app-task-form')).toBeNull();
    expect(titlesIn('OPEN')).toContain('Request missing signature');
  });

  it('edits a task from its card', async () => {
    render();
    answerRefresh();

    button(cardOf('Send payment reminder'), 'Edit').click();
    fixture.detectChanges();
    const form = find(page, 'app-task-form');
    expect(find<HTMLInputElement>(form, '#task-title').value).toBe('Send payment reminder');

    typeInto(form, '#task-title', 'Send second payment reminder');
    button(form, 'Save changes').click();
    const request = http.expectOne({ method: 'PUT', url: '/api/tasks/2' });
    request.flush({ ...boardTasks[1], title: 'Send second payment reminder' });
    await settle(fixture);

    expect(request.request.body.title).toBe('Send second payment reminder');
    expect(page.querySelector('app-task-form')).toBeNull();
    expect(titlesIn('IN_PROGRESS')).toEqual(['Send second payment reminder']);
  });

  it('deletes a task only after confirmation', () => {
    render();
    answerRefresh();

    button(cardOf('Check address change'), 'Delete').click();
    fixture.detectChanges();
    const question = find(page, 'app-confirm-dialog');
    expect(textOf(find(question, 'h2'))).toBe('Delete this task?');
    expect(textOf(find(question, 'p'))).toContain('“Check address change” is removed');

    button(question, 'Cancel').click();
    fixture.detectChanges();
    expect(page.querySelector('app-confirm-dialog')).toBeNull();

    button(cardOf('Check address change'), 'Delete').click();
    fixture.detectChanges();
    button(find(page, 'app-confirm-dialog'), 'Delete task').click();
    http
      .expectOne({ method: 'DELETE', url: '/api/tasks/1' })
      .flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(page.querySelector('app-confirm-dialog')).toBeNull();
    expect(titlesIn('OPEN')).toEqual(['Archive closed case file']);
  });

  it('moves and assigns tasks through the API', () => {
    render();
    answerRefresh();
    const [checkAddress, , archive] = boardTasks;

    find(cardOf('Check address change'), 'button[aria-label="Move to In progress"]').click();
    http
      .expectOne({ method: 'PUT', url: '/api/tasks/1' })
      .flush({ ...checkAddress, status: 'IN_PROGRESS', syncStatus: 'PENDING' });
    fixture.detectChanges();
    expect(titlesIn('IN_PROGRESS')).toEqual(['Check address change', 'Send payment reminder']);

    button(cardOf('Archive closed case file'), 'Assign').click();
    fixture.detectChanges();
    button(cardOf('Archive closed case file'), 'ckoch').click();
    http
      .expectOne({ method: 'PUT', url: '/api/tasks/3/assignee' })
      .flush({ ...archive, assignee: 'ckoch' });
    fixture.detectChanges();
    expect(textOf(find(cardOf('Archive closed case file'), '.card__assignee-name'))).toBe('ckoch');
  });

  it('reports a failed quick action until it is dismissed', () => {
    render();
    answerRefresh();

    find(cardOf('Send payment reminder'), 'button[aria-label="Move to Done"]').click();
    http
      .expectOne({ method: 'PUT', url: '/api/tasks/2' })
      .flush(
        { status: 404, detail: 'Task 2 does not exist' },
        { status: 404, statusText: 'Not Found' },
      );
    answerRefresh(boardTasks.filter(({ id }) => id !== 2));

    expect(texts(page, '[role="alert"]')).toEqual([
      'Could not move “Send payment reminder” to Done: Task 2 does not exist Dismiss',
    ]);
    expect(titlesIn('IN_PROGRESS')).toEqual([]);

    button(page, 'Dismiss').click();
    fixture.detectChanges();

    expect(page.querySelector('[role="alert"]')).toBeNull();
  });
});
