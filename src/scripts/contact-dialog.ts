const dialog = document.querySelector<HTMLDialogElement>('[data-contact-dialog]');

if (dialog && dialog.dataset.initialized !== 'true') {
  dialog.dataset.initialized = 'true';

  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll<HTMLAnchorElement>('[data-contact-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();

        if (!dialog.open) {
          dialog.showModal();
        }

        window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'contact_open' }));
      });
    });

    dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')?.addEventListener('click', () => {
      dialog.close();
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.querySelector<HTMLButtonElement>('[data-dialog-form]')?.addEventListener('click', () => {
      dialog.close();

      const contactTitle = document.querySelector<HTMLElement>('#contact-title');
      const contact = document.querySelector<HTMLElement>('#contact');

      contactTitle?.focus({ preventScroll: true });
      contact?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  }
}
