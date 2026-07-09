/* ═══════════════════════════════════════════════════════════════
   FINMACH — SEO Components JS v1.2
   ═══════════════════════════════════════════════════════════════ */

// ── FAQ Accordion ─────────────────────────────
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');

  // Zamknij wszystkie inne
  document.querySelectorAll('.faq-item.open').forEach(i => {
    if (i !== item) {
      i.classList.remove('open');
      i.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
    }
  });

  // Toggle kliknięty
  const newState = !isOpen;
  item.classList.toggle('open', newState);
  el.setAttribute('aria-expanded', String(newState));
}

// Obsługa klawiatury dla FAQ (Enter i Space)
function initFaqKeyboard() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    // Ustaw domyślne atrybuty ARIA
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');

    btn.addEventListener('click', () => toggleFaq(btn));
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFaq(btn);
      }
    });
  });
}

// ── Scroll do sekcji (NIE nadpisuje window.scrollTo) ──
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = document.querySelector('.seo-nav')?.offsetHeight || 80;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ── Śledzenie kliknięć CTA (GA4) ─────────────
function trackCTA(label) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'cta_click', {
      event_category: 'SEO',
      event_label: label,
      transport_type: 'beacon'
    });
  }
}

// ── Sticky CTA bar ────────────────────────────
function buildStickyCTA(label) {
  const bar = document.createElement('div');
  bar.id = 'stickyCTA';
  bar.setAttribute('role', 'complementary');
  bar.setAttribute('aria-label', 'Stały pasek CTA');

  // Style przez Object.assign (JS object, nie inline HTML attr)
  Object.assign(bar.style, {
    position:   'fixed',
    bottom:     '0',
    left:       '0',
    right:      '0',
    background: '#1d4ed8',
    color:      '#fff',
    padding:    '12px 24px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap:        '12px',
    flexWrap:   'wrap',
    zIndex:     '99',
    boxShadow:  '0 -4px 20px rgba(0,0,0,0.15)',
    transform:  'translateY(100%)',
    transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
    fontFamily: '"Plus Jakarta Sans",sans-serif',
  });

  const text = document.createElement('span');
  text.style.cssText = 'font-size:0.85rem;opacity:0.92;flex:1;min-width:120px';
  text.textContent = label || 'Sprawdź oferty dopasowane do Twojej firmy';

  const link = document.createElement('a');
  link.href = '/index.html?start=1';
  link.setAttribute('aria-label', 'Sprawdź bezpłatnie - znajdź finansowanie dla firmy');
  link.textContent = 'Sprawdź bezpłatnie →';
  Object.assign(link.style, {
    background:     '#fff',
    color:          '#1d4ed8',
    borderRadius:   '10px',
    padding:        '9px 20px',
    fontWeight:     '700',
    fontSize:       '0.85rem',
    textDecoration: 'none',
    whiteSpace:     'nowrap',
    display:        'inline-flex',
    alignItems:     'center',
    transition:     'transform 0.1s, box-shadow 0.1s',
  });

  // Hover przez JS events (nie inline)
  link.addEventListener('mouseenter', () => {
    link.style.transform  = 'scale(1.03)';
    link.style.boxShadow  = '0 4px 12px rgba(0,0,0,0.2)';
  });
  link.addEventListener('mouseleave', () => {
    link.style.transform  = 'scale(1)';
    link.style.boxShadow  = 'none';
  });
  link.addEventListener('click', () => trackCTA('sticky_cta'));

  bar.appendChild(text);
  bar.appendChild(link);
  return bar;
}

function renderStickyCTA(label) {
  // Warunkowe renderowanie — można wyłączyć przez data-sticky-cta="false"
  if (document.body.dataset.stickyCta === 'false') return;

  // Nie renderuj jeśli prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const bar = buildStickyCTA(label);
  document.body.appendChild(bar);

  // Scroll listener z requestAnimationFrame (throttle)
  let ticking = false;
  let shown   = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const shouldShow = window.scrollY > 500;
      if (shouldShow !== shown) {
        bar.style.transform = shouldShow ? 'translateY(0)' : 'translateY(100%)';
        shown = shouldShow;
      }
      ticking = false;
    });
  }, { passive: true });
}

// ── Breadcrumb JSON-LD (dynamiczny) ──────────
function injectBreadcrumbSchema() {
  // Jesli strona ma juz statyczny BreadcrumbList w HTML - nie duplikuj
  if (document.querySelector('script[data-static-breadcrumb]')) return;
  const crumbs = document.querySelectorAll('.breadcrumb a');
  if (!crumbs.length) return;

  const items = [];
  crumbs.forEach(a => {
    const url = new URL(a.href, window.location.origin);
    items.push({ name: a.textContent.trim(), url: url.pathname });
  });

  const h1 = document.querySelector('h1');
  if (h1) {
    items.push({ name: h1.textContent.trim(), url: window.location.pathname });
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       item.name,
      item:       'https://finmach.pl' + item.url,
    })),
  };

  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
}

// ── Anchor links w TOC → scrollToSection ─────
function initAnchorLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        scrollToSection(id);
      }
    });
  });
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFaqKeyboard();
  injectBreadcrumbSchema();
  initAnchorLinks();

  // Otwórz pierwszy FAQ
  const firstFaq = document.querySelector('.faq-item');
  if (firstFaq) {
    firstFaq.classList.add('open');
    firstFaq.querySelector('.faq-q')?.setAttribute('aria-expanded', 'true');
  }

  // Sticky CTA — label z data atrybutu body
  renderStickyCTA(document.body.dataset.stickyLabel || '');
});
