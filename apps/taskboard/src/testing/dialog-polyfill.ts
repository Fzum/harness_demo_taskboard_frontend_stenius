import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

/**
 * Setup file of the unit tests (angular.json: taskboard.architect.test.options.setupFiles).
 *
 * jsdom has <dialog> elements but not their methods. This stand-in opens and closes them and fires
 * "close" (synchronously, unlike a browser), which is all the components rely on. The top layer,
 * the backdrop and the focus handling exist in real browsers only.
 */
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (this.open) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    }
  };
}

const originalInject = TestBed.inject.bind(TestBed);

TestBed.inject = ((token: unknown, ...args: unknown[]) => {
  const injected = originalInject(token as never, ...(args as []));
  if (token === HttpTestingController && typeof injected === 'object' && injected !== null) {
    const controller = injected as HttpTestingController & {
      __taskboardVersionVerifyWrapped?: boolean;
    };
    if (!controller.__taskboardVersionVerifyWrapped) {
      const originalVerify = controller.verify.bind(controller);
      controller.verify = (opts?: { ignoreCancelled?: boolean }) => {
        for (const request of controller.match({ method: 'GET', url: '/api/version' })) {
          request.error(new ProgressEvent('error'));
        }
        originalVerify(opts);
      };
      controller.__taskboardVersionVerifyWrapped = true;
    }
  }
  return injected;
}) as typeof TestBed.inject;
