import { ComponentFixture, TestBed } from '@angular/core/testing';

import { button, find, findAll, textOf, typeInto } from '../../testing/dom';
import { aTask } from '../../testing/tasks';
import { ASSIGNEE_HINT, Task, TaskStatus } from '../tasks/task';
import { TaskCard } from './task-card';

describe('TaskCard', () => {
  function render(task: Task, assignees: string[] = []): ComponentFixture<TaskCard> {
    const fixture = TestBed.createComponent(TaskCard);
    fixture.componentRef.setInput('task', task);
    fixture.componentRef.setInput('assignees', assignees);
    fixture.detectChanges();
    return fixture;
  }

  function card(fixture: ComponentFixture<TaskCard>): HTMLElement {
    return fixture.nativeElement;
  }

  /** The tooltip that describes an element (aria-describedby). */
  function tooltipOf(element: HTMLElement): HTMLElement {
    const tooltip = document.getElementById(element.getAttribute('aria-describedby') ?? '');
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    return tooltip as HTMLElement;
  }

  it('shows title, description, assignee and due date', () => {
    const element = card(render(aTask()));

    expect(textOf(find(element, '.card__title'))).toBe('Clarify returned direct debit');
    expect(textOf(find(element, '.card__description'))).toBe(
      'The bank returned the October instalment',
    );
    expect(textOf(find(element, '.card__assignee-name'))).toBe('amueller');
    expect(textOf(find(element, '.card__due'))).toBe('Due Oct 31, 2026');
    expect(find(element, '.card__due time').getAttribute('datetime')).toBe('2026-10-31');
  });

  it('shows an unassigned task without a description or a due date', () => {
    const element = card(render(aTask({ description: null, assignee: null, dueDate: null })));

    expect(textOf(find(element, '.card__assignee'))).toBe('Unassigned');
    expect(element.querySelector('.card__description')).toBeNull();
    expect(element.querySelector('.card__due')).toBeNull();
  });

  describe('due date', () => {
    beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-14T12:00'), toFake: ['Date'] }));
    afterEach(() => vi.useRealTimers());

    it('highlights a task due before today', () => {
      const element = card(render(aTask({ dueDate: '2026-10-13' })));

      expect(find(element, '.card').classList).toContain('card--overdue');
      expect(textOf(find(element, '.card__due'))).toBe('Overdue Due Oct 13, 2026');
    });

    it('does not highlight a task due today', () => {
      const element = card(render(aTask({ dueDate: '2026-10-14' })));

      expect(find(element, '.card').classList).not.toContain('card--overdue');
      expect(element.querySelector('.card__overdue')).toBeNull();
    });

    it('does not highlight a done task, however late', () => {
      const element = card(render(aTask({ dueDate: '2026-10-01', status: 'DONE' })));

      expect(element.querySelector('.card__overdue')).toBeNull();
    });
  });

  it.each([
    [
      'PENDING',
      'Pending host sync',
      'The datasync writes the change to the host within 30 seconds',
    ],
    ['SYNCED', 'In sync with host', 'The host has the latest version of this task'],
    ['FAILED', 'Host inconsistency', 'could not write the latest change to the host'],
  ] as const)('shows the %s sync status as "%s" with an explanation', (syncStatus, text, tip) => {
    const badge = find(card(render(aTask({ syncStatus }))), '.card__sync');

    expect(textOf(badge)).toBe(text);
    expect(textOf(tooltipOf(badge))).toContain(tip);
    expect(badge.tabIndex).toBe(0);
  });

  it('marks a host task with its host key', () => {
    const badge = find(
      card(render(aTask({ source: 'HOST', hostId: 'H000001001', syncStatus: 'SYNCED' }))),
      '.card__source',
    );

    expect(textOf(badge)).toBe('Host H000001001');
    expect(textOf(tooltipOf(badge))).toBe('Created on the IBM host and loaded by the datasync.');
  });

  it('marks a Taskboard task with its host key once the host has it', () => {
    const badge = find(card(render(aTask({ hostId: 'T000000042' }))), '.card__source');

    expect(textOf(badge)).toBe('Taskboard T000000042');
    expect(textOf(tooltipOf(badge))).toBe(
      'Created in the Taskboard. The host knows it as T000000042.',
    );
  });

  it('marks a Taskboard task the host does not have yet', () => {
    const badge = find(card(render(aTask({ hostId: null }))), '.card__source');

    expect(textOf(badge)).toBe('Taskboard');
    expect(textOf(tooltipOf(badge))).toBe(
      'Created in the Taskboard. The host does not have it yet.',
    );
  });

  it.each([
    ['OPEN', ['Move to In progress', 'Move to Done']],
    ['IN_PROGRESS', ['Move to Open', 'Move to Done']],
    ['DONE', ['Move to Open', 'Move to In progress']],
  ] as const)('offers to move an %s task to the other columns', (status, labels) => {
    const moves = findAll(card(render(aTask({ status }))), 'button[aria-label^="Move to"]');

    expect(moves.map((move) => move.getAttribute('aria-label'))).toEqual(labels);
  });

  it('emits the status to move to', () => {
    const fixture = render(aTask({ status: 'IN_PROGRESS' }));
    const moved: TaskStatus[] = [];
    fixture.componentInstance.move.subscribe((status) => moved.push(status));

    find(card(fixture), 'button[aria-label="Move to Done"]').click();

    expect(moved).toEqual(['DONE']);
  });

  it('emits edit and delete', () => {
    const fixture = render(aTask());
    const actions: string[] = [];
    fixture.componentInstance.edit.subscribe(() => actions.push('edit'));
    fixture.componentInstance.delete.subscribe(() => actions.push('delete'));

    button(card(fixture), 'Edit').click();
    button(card(fixture), 'Delete').click();

    expect(actions).toEqual(['edit', 'delete']);
  });

  describe('assigning', () => {
    function open(task: Task, assignees: string[]) {
      const fixture = render(task, assignees);
      const assigned: (string | null)[] = [];
      fixture.componentInstance.assign.subscribe((assignee) => assigned.push(assignee));
      const toggle = button(card(fixture), task.assignee ? 'Reassign' : 'Assign');
      toggle.click();
      fixture.detectChanges();
      return { fixture, assigned, toggle, element: card(fixture) };
    }

    it('opens the assignee picker from the card', () => {
      const { toggle, element } = open(aTask(), ['amueller', 'bweber']);

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(toggle.getAttribute('aria-controls')).toBe('task-42-assign');
      expect(find(element, 'app-assignee-picker').id).toBe('task-42-assign');
    });

    it('suggests the assignees already on the board, except the current one', () => {
      const { element } = open(aTask({ assignee: 'amueller' }), ['amueller', 'bweber', 'ckoch']);

      expect(findAll(element, '.picker__suggestion').map(textOf)).toEqual(['bweber', 'ckoch']);
    });

    it('assigns a suggested user with one click and closes the picker', () => {
      const { fixture, assigned, element } = open(aTask({ assignee: null }), ['bweber']);

      button(element, 'bweber').click();
      fixture.detectChanges();

      expect(assigned).toEqual(['bweber']);
      expect(element.querySelector('app-assignee-picker')).toBeNull();
    });

    it('assigns another user id only once it is a valid user id', async () => {
      const { fixture, assigned, element } = open(aTask({ assignee: null }), []);
      const picker = find(element, 'app-assignee-picker');

      typeInto(picker, 'input', 'B.Weber');
      find(picker, 'button[type="submit"]').click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(textOf(find(picker, '.field__error'))).toBe(ASSIGNEE_HINT);
      expect(find(picker, 'input').getAttribute('aria-invalid')).toBe('true');
      expect(assigned).toEqual([]);

      typeInto(picker, 'input', 'bweber2');
      find(picker, 'button[type="submit"]').click();
      await fixture.whenStable();

      expect(assigned).toEqual(['bweber2']);
    });

    it('unassigns the current assignee', () => {
      const { assigned, element } = open(aTask({ assignee: 'amueller' }), ['amueller']);

      button(element, 'Unassign amueller').click();

      expect(assigned).toEqual([null]);
    });
  });
});
