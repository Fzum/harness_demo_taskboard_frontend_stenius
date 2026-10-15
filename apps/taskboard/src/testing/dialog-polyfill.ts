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
