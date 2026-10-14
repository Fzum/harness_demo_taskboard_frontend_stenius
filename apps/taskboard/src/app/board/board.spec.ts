import { ComponentFixture, TestBed } from '@angular/core/testing';

import { button, find, texts } from '../../testing/dom';
import { aTask, boardTasks } from '../../testing/tasks';
import { Task } from '../tasks/task';
import { Board, TaskAssignment, TaskMove } from './board';

describe('Board', () => {
  function render(tasks: Task[], assignees: string[] = []): ComponentFixture<Board> {
    const fixture = TestBed.createComponent(Board);
    fixture.componentRef.setInput('tasks', tasks);
    fixture.componentRef.setInput('assignees', assignees);
    fixture.detectChanges();
    return fixture;
  }

  function column(fixture: ComponentFixture<Board>, status: string): HTMLElement {
    return find(fixture.nativeElement, `.column[data-status="${status}"]`);
  }

  it('shows a column per status, with the number of tasks in it', () => {
    const fixture = render(boardTasks);

    expect(texts(fixture.nativeElement, '.column__heading')).toEqual([
      'Open 2 tasks',
      'In progress 1 task',
      'Done 1 task',
    ]);
    expect(texts(column(fixture, 'OPEN'), '.card__title')).toEqual([
      'Check address change',
      'Archive closed case file',
    ]);
    expect(texts(column(fixture, 'IN_PROGRESS'), '.card__title')).toEqual([
      'Send payment reminder',
    ]);
    expect(texts(column(fixture, 'DONE'), '.card__title')).toEqual(['Correct duplicate booking']);
  });

  it('labels each column with its heading', () => {
    const open = column(render(boardTasks), 'OPEN');

    expect(open.getAttribute('aria-labelledby')).toBe('column-OPEN');
    expect(find(open, 'h2').id).toBe('column-OPEN');
  });

  it('says so when a column has no tasks', () => {
    const fixture = render([aTask({ status: 'OPEN' })]);

    expect(texts(column(fixture, 'IN_PROGRESS'), 'li')).toEqual(['Nothing here']);
    expect(texts(column(fixture, 'DONE'), 'li')).toEqual(['Nothing here']);
  });

  it('shows an empty state that offers to create a task when there are no tasks', () => {
    const fixture = render([]);
    let created = 0;
    fixture.componentInstance.create.subscribe(() => created++);

    expect(texts(fixture.nativeElement, '.empty__heading')).toEqual(['No tasks yet']);
    expect(fixture.nativeElement.querySelector('.column')).toBeNull();
    button(fixture.nativeElement, 'New task').click();

    expect(created).toBe(1);
  });

  it('passes the actions of a card on, naming its task', () => {
    const fixture = render(boardTasks, ['amueller', 'bweber']);
    const board = fixture.componentInstance;
    const [first] = boardTasks;
    const edited: Task[] = [];
    const moved: TaskMove[] = [];
    const assigned: TaskAssignment[] = [];
    const deleted: Task[] = [];
    board.edit.subscribe((task) => edited.push(task));
    board.move.subscribe((move) => moved.push(move));
    board.assign.subscribe((assignment) => assigned.push(assignment));
    board.delete.subscribe((task) => deleted.push(task));
    const card = find(fixture.nativeElement, 'app-task-card');

    button(card, 'Edit').click();
    find(card, 'button[aria-label="Move to Done"]').click();
    button(card, 'Delete').click();
    button(card, 'Reassign').click();
    fixture.detectChanges();
    button(card, 'amueller').click();

    expect(edited).toEqual([first]);
    expect(moved).toEqual([{ task: first, status: 'DONE' }]);
    expect(deleted).toEqual([first]);
    expect(assigned).toEqual([{ task: first, assignee: 'amueller' }]);
  });

  describe('when a task changes columns', () => {
    function moveFirstTaskToDone(fixture: ComponentFixture<Board>): void {
      const [first, ...others] = boardTasks;
      fixture.componentRef.setInput('tasks', [{ ...first, status: 'DONE' }, ...others]);
      fixture.detectChanges();
    }

    it('hands the focus in its card on to its new card', () => {
      const fixture = render(boardTasks);
      find(column(fixture, 'OPEN'), 'button[aria-label="Move to Done"]').focus();

      moveFirstTaskToDone(fixture);

      expect(document.activeElement).toBe(
        find(column(fixture, 'DONE'), 'article[aria-labelledby="task-1-title"]'),
      );
    });

    it('leaves the focus alone once it has left the card', () => {
      const fixture = render(boardTasks);
      find(column(fixture, 'OPEN'), 'button[aria-label="Move to Done"]').focus();
      const elsewhere = document.body.appendChild(document.createElement('button'));
      onTestFinished(() => elsewhere.remove());
      elsewhere.focus();

      moveFirstTaskToDone(fixture);

      expect(document.activeElement).toBe(elsewhere);
    });
  });
});
