const hero = document.querySelector<HTMLElement>('[data-hero]');
const contact = document.querySelector<HTMLElement>('#contact');
const cta = document.querySelector<HTMLElement>('[data-mobile-cta]');

if (
  hero &&
  contact &&
  cta &&
  cta.dataset.initialized !== 'true' &&
  'IntersectionObserver' in window
) {
  cta.dataset.initialized = 'true';

  let heroVisible = true;
  let contactVisible = false;

  const render = () => {
    cta.hidden = heroVisible || contactVisible;
  };

  new IntersectionObserver(
    ([entry]) => {
      heroVisible = entry.isIntersecting;
      render();
    },
    { threshold: 0.05 },
  ).observe(hero);

  new IntersectionObserver(
    ([entry]) => {
      contactVisible = entry.isIntersecting;
      render();
    },
    { threshold: 0.05 },
  ).observe(contact);
}
