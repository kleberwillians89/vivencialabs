const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const animatedItems = document.querySelectorAll('img, [data-count]');

function countUp(element) {
  const total = Number(element.dataset.count);
  const start = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - start) / 900);
    element.textContent = String(Math.round(total * (1 - (1 - progress) ** 3)));
    if (progress < 1) requestAnimationFrame(tick);
  }

  element.textContent = '0';
  requestAnimationFrame(tick);
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (reducedMotion.matches) continue;
      if ('count' in target.dataset) countUp(target);
      else target.classList.add('image-enter');
    }
  }, { threshold: 0.2 });

  animatedItems.forEach(item => {
    if ('count' in item.dataset && !reducedMotion.matches) item.textContent = '0';
    observer.observe(item);
  });
}

document.querySelectorAll('[data-scroll]').forEach(button => {
  button.addEventListener('click', () => {
    const rail = document.getElementById(button.dataset.scroll);
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    const distance = rail.firstElementChild.getBoundingClientRect().width + gap;
    if (button.hasAttribute('data-wrap') && rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2) {
      rail.scrollTo({ left: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      return;
    }
    rail.scrollBy({
      left: distance * Number(button.dataset.direction),
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
  });
});

const concept = document.querySelector('.concept-box');
const tabs = [...concept.querySelectorAll('[role="tab"]')];
const compactConcept = window.matchMedia('(max-width: 720px)');
function activateConcept(index, focus = false) {
  concept.dataset.concept = index === 0 ? 'a' : 'b';
  tabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = compactConcept.matches && !selected;
  });
  if (focus) tabs[index].focus();
}
activateConcept(0);
compactConcept.addEventListener('change', () => activateConcept(Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'))));
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateConcept(index));
  tab.addEventListener('keydown', event => {
    const next = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activateConcept(next, true);
  });
});

const bridge = document.querySelector('.bridge');
const bridgeStops = [...document.querySelectorAll('.bridge-stop')];
const hoverBridge = window.matchMedia('(hover: hover) and (pointer: fine)');
let activeStop = null;
let pinnedStop = null;
let bridgeLeaveTimer;
function openBridgeStop(stop) {
  clearTimeout(bridgeLeaveTimer);
  activeStop = stop;
  bridge.classList.toggle('has-open-stop', Boolean(stop));
  bridgeStops.forEach(item => {
    const expanded = item === stop;
    const pin = item.querySelector('[data-bridge]');
    item.classList.toggle('is-open', expanded);
    pin.setAttribute('aria-expanded', String(expanded));
    pin.querySelector('b').textContent = expanded ? '−' : '+';
    document.getElementById(pin.getAttribute('aria-controls')).hidden = !expanded;
  });
}
bridgeStops.forEach(stop => {
  const pin = stop.querySelector('[data-bridge]');
  stop.addEventListener('pointerenter', event => {
    if (hoverBridge.matches && event.pointerType === 'mouse') {
      pinnedStop = null;
      openBridgeStop(stop);
    }
  });
  stop.addEventListener('pointerleave', () => {
    if (!pinnedStop) bridgeLeaveTimer = setTimeout(() => {
      if (!stop.contains(document.activeElement)) openBridgeStop(null);
    }, 120);
  });
  stop.addEventListener('focusin', () => openBridgeStop(stop));
  stop.addEventListener('focusout', event => {
    if (!stop.contains(event.relatedTarget) && !pinnedStop) openBridgeStop(null);
  });
  pin.addEventListener('click', () => {
    const close = pinnedStop === stop;
    pinnedStop = close ? null : stop;
    openBridgeStop(close ? null : stop);
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeStop) { pinnedStop = null; openBridgeStop(null); }
});
document.addEventListener('pointerdown', event => {
  if (activeStop && !event.target.closest('.bridge-stop')) { pinnedStop = null; openBridgeStop(null); }
});

// Only public contact settings are read here; database keys remain on the server.
const contactConfig = window.VIVENCIA_CONFIG || {};
const whatsapp = contactConfig.specialistWhatsApp || '';
document.querySelectorAll('[data-specialist]').forEach(link => {
  link.href = /^[1-9]\d{9,14}$/.test(whatsapp)
    ? `https://wa.me/${whatsapp}`
    : `mailto:${contactConfig.specialistEmail || 'contato@vivencialab.com.br'}`;
});

const dialog = document.getElementById('download');
const form = document.getElementById('study-form');
const submit = form.querySelector('[type="submit"]');
const status = form.querySelector('.form-status');
let opener;
let submitting = false;
let lastPayload = '';
let requestId = '';
let confirmedPayload = '';
// Resolve relative to the executing script, both at / and under the client folder.
const applicationBase = new URL('.', document.querySelector('script[src*="app.js"]').src);
const leadEndpoint = new URL('api/leads', applicationBase);
function updateDialogViewport() {
  const viewport = window.visualViewport;
  document.documentElement.style.setProperty('--dialog-viewport-height', `${viewport?.height || window.innerHeight}px`);
  document.documentElement.style.setProperty('--dialog-viewport-top', `${viewport?.offsetTop || 0}px`);
}
window.visualViewport?.addEventListener('resize', updateDialogViewport);
window.visualViewport?.addEventListener('scroll', updateDialogViewport);
window.addEventListener('resize', updateDialogViewport);
document.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', () => {
  if (submitting) return;
  opener = button;
  updateDialogViewport();
  dialog.showModal();
  dialog.querySelector('.modal-scroll').scrollTop = 0;
}));
dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener?.focus());
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !form.reportValidity()) return;
  const payload = Object.fromEntries(['name', 'email', 'company', 'role', 'support'].map(key => [key, form.elements[key].value.trim()]));
  Object.assign(payload, { material: 'estudo', consent: form.elements.consent.checked, newsletter: form.elements.newsletter.checked });
  const fingerprint = JSON.stringify(payload);
  if (fingerprint === confirmedPayload) return;
  if (fingerprint !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = fingerprint; }
  submitting = true;
  submit.disabled = true;
  submit.textContent = 'Salvando cadastro…';
  form.setAttribute('aria-busy', 'true');
  status.textContent = '';
  delete status.dataset.state;
  try {
    const response = await fetch(leadEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId }), signal: AbortSignal.timeout(35000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true || result.leadSaved !== true || result.requestId !== requestId) throw new Error('Não foi possível confirmar seu cadastro. Seus campos foram mantidos. Tente novamente.');
    confirmedPayload = fingerprint;
    status.dataset.state = 'success';
    status.textContent = 'Cadastro confirmado! O estudo ainda não está disponível para download.';
  } catch {
    status.dataset.state = 'error';
    status.textContent = 'Não foi possível confirmar seu cadastro. Seus campos foram mantidos. Tente novamente.';
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.textContent = status.dataset.state === 'error' ? 'Tentar novamente' : 'Cadastrar interesse';
    form.removeAttribute('aria-busy');
    status.scrollIntoView({ block: 'nearest' });
    status.focus({ preventScroll: true });
  }
});
