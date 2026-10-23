import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { button, find, findAll, settle, textOf, texts, typeInto } from '../../testing/dom';
import { aTask } from '../../testing/tasks';
import { ASSIGNEE_HINT, Task } from '../tasks/task';
import { TaskForm } from './task-form';

describe('TaskForm', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render(task: Task | null = null, assignees: string[] = []) {
    const fixture = TestBed.createComponent(TaskForm);
    fixture.componentRef.setInput('task', task);
    fixture.componentRef.setInput('assignees', assignees);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, closed, dialog: find<HTMLDialogElement>(element, 'dialog') };
  }

  /** The messages under the fields. */
  function fieldErrors(element: HTMLElement): string[] {
    return texts(element, '.field__error');
  }

  describe('for a new task', () => {
    it('opens as a modal dialog without a status field', () => {
      const { element, dialog } = render();

      expect(dialog.open).toBe(true);
      expect(textOf(find(element, 'h2'))).toBe('New task');
      expect(element.querySelector('#task-status')).toBeNull();
      expect(find(element, 'button[type="submit"]').textContent?.trim()).toBe('Create task');
    });

    it('creates the task with trimmed values and nulls for empty fields, then closes', async () => {
      const { fixture, element, closed, dialog } = render();

      typeInto(element, '#task-title', '  Request missing signature  ');
      typeInto(element, '#task-assignee', 'bweber');
      typeInto(element, '#task-due-date', '2026-11-30');
      button(element, 'Create task').click();
      const request = http.expectOne({ method: 'POST', url: '/api/tasks' });
      request.flush(aTask({ id: 5, title: 'Request missing signature' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle(fixture);

      expect(request.request.body).toStrictEqual({
        title: 'Request missing signature',
        description: null,
        assignee: 'bweber',
        dueDate: '2026-11-30',
        priority: 'MEDIUM',
      });
      expect(dialog.open).toBe(false);
      expect(closed).toHaveBeenCalledOnce();
    });

    it('offers High, Medium and Low with Medium preselected', async () => {
      const { fixture, element } = render();
      await settle(fixture);

      expect(texts(element, '#task-priority option')).toEqual(['High', 'Medium', 'Low']);
      expect(find<HTMLSelectElement>(element, '#task-priority').value).toBe('MEDIUM');
    });

    it('sends the chosen priority', async () => {
      const { fixture, element } = render();

      typeInto(element, '#task-title', 'Urgent call');
      typeInto(element, '#task-priority', 'HIGH');
      button(element, 'Create task').click();
      const request = http.expectOne({ method: 'POST', url: '/api/tasks' });
      request.flush(aTask({ priority: 'HIGH' }), { status: 201, statusText: 'Created' });
      await settle(fixture);

      expect(request.request.body).toMatchObject({ priority: 'HIGH' });
    });

    it('suggests the assignees on the board', () => {
      const { element } = render(null, ['amueller', 'bweber']);

      expect(find(element, '#task-assignee').getAttribute('list')).toBe(
        'task-assignee-suggestions',
      );
      expect(
        findAll<HTMLOptionElement>(element, '#task-assignee-suggestions option').map(
          (option) => option.value,
        ),
      ).toEqual(['amueller', 'bweber']);
    });

    it('closes without saving on Cancel', () => {
      const { element, closed, dialog } = render();

      typeInto(element, '#task-title', 'Never mind');
      button(element, 'Cancel').click();

      expect(dialog.open).toBe(false);
      expect(closed).toHaveBeenCalledOnce();
    });
  });

  describe('validation', () => {
    it('asks for a title', async () => {
      const { fixture, element } = render();

      button(element, 'Create task').click();
      await settle(fixture);

      expect(fieldErrors(element)).toEqual(['Enter a title.']);
      expect(find(element, '#task-title').getAttribute('aria-invalid')).toBe('true');
    });

    it('does not take a title of only spaces', () => {
      const { fixture, element } = render();

      typeInto(element, '#task-title', '   ');
      fixture.detectChanges();

      expect(fieldErrors(element)).toEqual(['Enter a title.']);
    });

    it('mirrors the field limits of the host record and sends nothing while they are broken', async () => {
      const { fixture, element, closed } = render();

      typeInto(element, '#task-title', 'x'.repeat(41));
      typeInto(element, '#task-description', 'x'.repeat(201));
      typeInto(element, '#task-assignee', 'A.Mueller');
      button(element, 'Create task').click();
      await settle(fixture);

      expect(fieldErrors(element)).toEqual([
        'Use at most 40 characters.',
        'Use at most 200 characters.',
        ASSIGNEE_HINT,
      ]);
      expect(texts(element, '.field__count')).toEqual(['41 / 40', '201 / 200']);
      expect(findAll(element, '.field__count--over')).toHaveLength(2);
      expect(closed).not.toHaveBeenCalled();
    });

    it('takes the focus to the first field to correct', async () => {
      const { fixture, element } = render();

      typeInto(element, '#task-title', 'Request missing signature');
      typeInto(element, '#task-assignee', 'A.Mueller');
      button(element, 'Create task').click();
      await settle(fixture);

      expect(document.activeElement).toBe(find(element, '#task-assignee'));
    });

    it('takes values right at the limits', () => {
      const { fixture, element } = render();

      typeInto(element, '#task-title', 'x'.repeat(40));
      typeInto(element, '#task-description', 'x'.repeat(200));
      typeInto(element, '#task-assignee', 'a2345678');
      fixture.detectChanges();

      expect(fieldErrors(element)).toEqual([]);
      expect(texts(element, '.field__count')).toEqual(['40 / 40', '200 / 200']);
    });
  });

  describe('for an existing task', () => {
    const task = aTask({ status: 'IN_PROGRESS', hostId: 'T000000042' });

    it('starts from the task, including its status', async () => {
      const { fixture, element } = render(task);
      // The select takes its value once its options are rendered.
      await settle(fixture);

      expect(textOf(find(element, 'h2'))).toBe('Edit task');
      expect(find<HTMLInputElement>(element, '#task-title').value).toBe(task.title);
      expect(find<HTMLTextAreaElement>(element, '#task-description').value).toBe(task.description);
      expect(find<HTMLInputElement>(element, '#task-assignee').value).toBe('amueller');
      expect(find<HTMLInputElement>(element, '#task-due-date').value).toBe('2026-10-31');
      expect(find<HTMLSelectElement>(element, '#task-status').value).toBe('IN_PROGRESS');
    });

    it("starts from the task's priority and sends a changed one", async () => {
      const { fixture, element } = render(aTask({ priority: 'LOW' }));
      await settle(fixture);
      expect(find<HTMLSelectElement>(element, '#task-priority').value).toBe('LOW');

      typeInto(element, '#task-priority', 'HIGH');
      button(element, 'Save changes').click();
      const request = http.expectOne({ method: 'PUT', url: '/api/tasks/42' });
      request.flush(aTask({ priority: 'HIGH' }));
      await settle(fixture);

      expect(request.request.body).toMatchObject({ priority: 'HIGH' });
    });

    it('replaces the editable fields, clearing the emptied ones', async () => {
      const { fixture, element, closed } = render(task);

      typeInto(element, '#task-description', '');
      typeInto(element, '#task-assignee', '');
      typeInto(element, '#task-status', 'DONE');
      button(element, 'Save changes').click();
      const request = http.expectOne({ method: 'PUT', url: '/api/tasks/42' });
      request.flush({ ...task, description: null, assignee: null, status: 'DONE' });
      await settle(fixture);

      expect(request.request.body).toStrictEqual({
        title: 'Clarify returned direct debit',
        description: null,
        status: 'DONE',
        assignee: null,
        dueDate: '2026-10-31',
        priority: 'MEDIUM',
      });
      expect(closed).toHaveBeenCalledOnce();
    });
  });

  describe('server errors', () => {
    async function saveAndFail(body: object | null, status: number, statusText: string) {
      const form = render();
      typeInto(form.element, '#task-title', 'Request missing signature');
      typeInto(form.element, '#task-assignee', 'bweber');
      button(form.element, 'Create task').click();
      const request = http.expectOne({ method: 'POST', url: '/api/tasks' });
      if (status === 0) {
        request.error(new ProgressEvent('error'));
      } else {
        request.flush(body, { status, statusText });
      }
      await settle(form.fixture);
      return form;
    }

    it('shows the validation errors of the problem details on their fields', async () => {
      const { element, closed, dialog } = await saveAndFail(
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid request content.',
          errors: { title: 'must not contain tabs', assignee: 'is not a known user' },
        },
        400,
        'Bad Request',
      );

      expect(fieldErrors(element)).toEqual(['must not contain tabs', 'is not a known user']);
      expect(find(element, '#task-assignee').getAttribute('aria-invalid')).toBe('true');
      expect(dialog.open).toBe(true);
      expect(closed).not.toHaveBeenCalled();
    });

    it('drops a server error once its field changes', async () => {
      const { fixture, element } = await saveAndFail(
        {
          status: 400,
          errors: { title: 'must not contain tabs', assignee: 'is not a known user' },
        },
        400,
        'Bad Request',
      );

      typeInto(element, '#task-title', 'Request a missing signature');
      fixture.detectChanges();

      expect(fieldErrors(element)).toEqual(['is not a known user']);
    });

    it('shows errors about other fields, and other failures, on the form as a whole', async () => {
      const { element } = await saveAndFail(
        { status: 400, errors: { source: 'must not be set' } },
        400,
        'Bad Request',
      );

      expect(texts(element, '[role="alert"]')).toEqual(['source: must not be set']);
      expect(fieldErrors(element)).toEqual([]);
    });

    it('explains a failure without validation errors', async () => {
      const conflict = await saveAndFail(
        { status: 409, detail: 'Task 42 was changed in the meantime' },
        409,
        'Conflict',
      );
      expect(texts(conflict.element, '[role="alert"]')).toEqual([
        'The task could not be saved: Task 42 was changed in the meantime',
      ]);
    });

    it('says so when the backend is unreachable', async () => {
      const { element } = await saveAndFail(null, 0, '');

      expect(texts(element, '[role="alert"]')).toEqual([
        'The task could not be saved: the backend is unreachable',
      ]);
    });
  });
});
