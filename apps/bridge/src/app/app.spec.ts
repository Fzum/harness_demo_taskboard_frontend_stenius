import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  it('shows the Bridge placeholder page of the Stenius shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('h1')?.textContent).toBe('Bridge');
    expect(page.textContent).toContain('Part of the Stenius shell. No features yet.');
  });
});
