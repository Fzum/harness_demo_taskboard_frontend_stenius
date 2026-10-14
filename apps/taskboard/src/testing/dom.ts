import { ComponentFixture } from '@angular/core/testing';

/** The first element matching `selector`; fails the test if there is none. */
export function find<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`No element matches "${selector}"`);
  }
  return element;
}

export function findAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Text content with whitespace collapsed, as a user reads it. */
export function textOf(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function texts(root: ParentNode, selector: string): string[] {
  return findAll(root, selector).map(textOf);
}

/** The button whose text is `text`; fails the test if there is none. */
export function button(root: ParentNode, text: string): HTMLButtonElement {
  const match = findAll<HTMLButtonElement>(root, 'button').find((each) => textOf(each) === text);
  if (!match) {
    throw new Error(`No button reads "${text}"`);
  }
  return match;
}

/**
 * Enters a value into an input, textarea or select and leaves the field, firing the events a
 * browser fires, so the bound form field updates and counts as touched.
 */
export function typeInto(root: ParentNode, selector: string, value: string): void {
  const field = find<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(root, selector);
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur'));
}

/**
 * Lets pending promises finish, for example a submitted form that awaits the backend's answer,
 * and renders the result.
 */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}
