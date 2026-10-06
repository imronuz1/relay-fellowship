(() => {
  const body = document.body;
  if (!body?.hasAttribute('data-relay-theme')) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.createElement('div');
  progress.className = 'relay-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  body.append(progress);

  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
      body.classList.toggle('relay-scrolled', scrollY > 24);
      scrollFrame = 0;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (reduceMotion || !('IntersectionObserver' in window)) return;

  const revealSelectors = [
    '.min-h-screen > section',
    '.min-h-screen > main',
    '.home-program-card',
    '.min-h-screen > section .card-elevated',
    '.catalog-section > .section-heading',
    '.filter-panel',
    '.program-card',
    '.collection-section > .section-heading',
    '.collection-empty',
    '.flex-primary > .flex-panel',
    '.flex-side > .flex-panel',
    '.flex-sources',
    '.signup-card',
    '#app .mode-card',
    '#app .history-row',
    '#app .review-card'
  ];
  const elements = [...new Set(document.querySelectorAll(revealSelectors.join(',')))];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });

  for (const element of elements) {
    if (element.closest('.hero-surface') || element.hasAttribute('hidden')) continue;
    const siblings = [...element.parentElement.children].filter(child => child.matches?.('.home-program-card,.program-card,.card-elevated,.mode-card'));
    if (siblings.length > 1) element.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(element), 5) * 75}ms`);
    element.classList.add('relay-reveal');
    observer.observe(element);
  }
  requestAnimationFrame(() => body.classList.add('motion-ready'));

  const count = document.querySelector('.hero-count strong');
  if (count && /^\d+$/.test(count.textContent.trim())) {
    const finalText = count.textContent.trim();
    const target = Number(finalText);
    const counter = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      counter.disconnect();
      const start = performance.now();
      const draw = now => {
        const ratio = Math.min(1, (now - start) / 850);
        const eased = 1 - Math.pow(1 - ratio, 3);
        count.textContent = String(Math.round(target * eased)).padStart(finalText.length, '0');
        if (ratio < 1) requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    }, { threshold: 0.5 });
    counter.observe(count);
  }

  const hero = document.querySelector('.hero-surface');
  if (hero && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let pointerFrame = 0;
    hero.addEventListener('pointermove', event => {
      if (pointerFrame) return;
      const x = event.clientX;
      const y = event.clientY;
      pointerFrame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--pointer-x', `${((x - rect.left) / rect.width * 100).toFixed(1)}%`);
        hero.style.setProperty('--pointer-y', `${((y - rect.top) / rect.height * 100).toFixed(1)}%`);
        pointerFrame = 0;
      });
    }, { passive: true });
  }
})();
