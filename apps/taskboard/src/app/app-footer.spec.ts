import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { find, textOf, texts } from '../testing/dom';
import { boardTasks } from '../testing/tasks';
import { App } from './app';

describe('App footer', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function render(): void {
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    page = fixture.nativeElement;
  }

  function answerInitialRefresh(): void {
    http.expectOne({ method: 'GET', url: '/api/tasks' }).flush(boardTasks);
    fixture.detectChanges();
  }

  it('renders the backend version as small footer chrome after a successful version read', () => {
    render();
    answerInitialRefresh();
    http.expectOne({ method: 'GET', url: '/api/version' }).flush({ version: '1.2.3-SNAPSHOT' });
    fixture.detectChanges();

    expect(textOf(find(page, 'footer small'))).toBe('Backend version 1.2.3-SNAPSHOT');
  });

  it('keeps the footer visible with the neutral label when the version read fails', () => {
    render();
    answerInitialRefresh();
    http.expectOne({ method: 'GET', url: '/api/version' }).error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(textOf(find(page, 'footer small'))).toBe('Backend version unavailable');
    expect(texts(page, '.card__title')).toEqual([
      'Check address change',
      'Archive closed case file',
      'Send payment reminder',
      'Correct duplicate booking',
    ]);
  });
});
