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
const studyNotice = document.getElementById('study-unavailable');
let studyNoticeOpener;
const form = document.getElementById('study-form');
const submit = form.querySelector('[type="submit"]');
const status = form.querySelector('.form-status');
const download = document.getElementById('material-download');
let opener;
let material = 'brandbook';
let submitting = false;
let lastPayload = '';
let requestId = '';
let downloadExpiryTimer;
let savedDownload;
const drafts = new Map();
function captureDraft() {
  return Object.fromEntries(['name', 'email', 'company', 'role', 'support'].map(key => [key, form.elements[key].value]).concat(
    [['consent', form.elements.consent.checked], ['newsletter', form.elements.newsletter.checked]]));
}
function lockRegisteredFields(locked) {
  form.querySelectorAll('.fields input, .fields textarea').forEach(field => { field.readOnly = locked; });
  form.querySelectorAll('.check input').forEach(field => { field.disabled = locked; });
}
function configureMaterial(nextMaterial) {
  lockRegisteredFields(false);
  clearTimeout(downloadExpiryTimer);
  drafts.set(material, captureDraft());
  material = nextMaterial;
  form.dataset.material = material;
  const draft = drafts.get(material);
  form.reset();
  if (draft) for (const [key, value] of Object.entries(draft)) {
    if (typeof value === 'boolean') form.elements[key].checked = value;
    else form.elements[key].value = value;
  }
  const brandbook = material === 'brandbook';
  document.getElementById('download-title').textContent = brandbook ? 'Baixe o brandbook da Vivência Lab' : 'Baixe o estudo completo';
  document.getElementById('download-description').textContent = brandbook
    ? 'Conheça a identidade, os valores e o universo visual da Vivência Lab neste material institucional. Preencha seus dados para solicitar o download do brandbook.'
    : 'Se a comunicação não sintoniza com o “beat” local e usa a cultura como cenário em vez de infraestrutura humana e criativa, ela é lida como desconectada da realidade. O jovem brasileiro decide para onde vai o fluxo do dinheiro baseado em quem valida sua identidade, e não em quem oferece apenas um desconto.';
  document.getElementById('download-instructions').textContent = brandbook
    ? 'Preencha os dados abaixo para solicitar o brandbook institucional da Vivência Lab.'
    : 'Preencha os dados abaixo para solicitar o estudo completo e planejar o futuro da sua marca ao lado da Vivência Lab.';
  document.getElementById('material-notice').textContent = brandbook
    ? 'O brandbook é um material institucional, separado do estudo sobre juventude. PDF de aproximadamente 70 MB. Após o cadastro, o link ficará disponível por 5 minutos.'
    : 'O PDF oficial do estudo ainda não está disponível. O envio deste formulário permanece desativado.';
  document.getElementById('contact-consent-text').textContent = `Autorizo a Vivência Lab a usar meus dados para disponibilizar o ${brandbook ? 'brandbook' : 'estudo'} solicitado e entrar em contato sobre seus conteúdos e serviços. Posso cancelar quando quiser.`;
  const sameSavedDraft = savedDownload?.fingerprint === JSON.stringify({ ...captureDraft(), material });
  if (sameSavedDraft) lockRegisteredFields(true);
  submit.textContent = sameSavedDraft ? 'Gerar novo link do PDF' : brandbook ? 'Baixar' : 'Baixar estudo';
  submit.disabled = !brandbook;
  submit.toggleAttribute('data-pending', !brandbook);
  status.textContent = '';
  delete status.dataset.state;
  download.hidden = true;
  download.removeAttribute('href');
}
document.querySelectorAll('[data-download]').forEach(button => {
  button.addEventListener('click', () => {
    if (submitting) return;
    updateDialogViewport();
    if (button.dataset.download !== 'brandbook') {
      studyNoticeOpener = button;
      studyNotice.showModal();
      studyNotice.querySelector('.modal-scroll').scrollTop = 0;
      return;
    }
    opener = studyNotice.contains(button) ? studyNoticeOpener : button;
    if (studyNotice.open) studyNotice.close();
    configureMaterial('brandbook');
    dialog.showModal();
    dialog.querySelector('.modal-scroll').scrollTop = 0;
  });
});
function updateDialogViewport() {
  const viewport = window.visualViewport;
  document.documentElement.style.setProperty('--dialog-viewport-height', `${viewport?.height || window.innerHeight}px`);
  document.documentElement.style.setProperty('--dialog-viewport-top', `${viewport?.offsetTop || 0}px`);
}
window.visualViewport?.addEventListener('resize', updateDialogViewport);
window.visualViewport?.addEventListener('scroll', updateDialogViewport);
window.addEventListener('resize', updateDialogViewport);
studyNotice.querySelectorAll('[data-close-study]').forEach(button => button.addEventListener('click', () => studyNotice.close()));
studyNotice.addEventListener('close', () => { if (!dialog.open) studyNoticeOpener?.focus(); });
dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener?.focus());
async function salvarLead(payload) {
  const response = await fetch('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(35000),
  });
  const result = await response.json().catch(() => ({}));
  return { ...result, httpOk: response.ok };
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (material !== 'brandbook' || submitting || !form.reportValidity()) return;
  const payload = { ...captureDraft(), material };
  const fingerprint = JSON.stringify(payload);
  if (fingerprint !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = fingerprint; }
  const downloadReceipt = savedDownload?.fingerprint === fingerprint ? savedDownload.receipt : undefined;
  submitting = true; submit.disabled = true; submit.textContent = downloadReceipt ? 'Gerando link do PDF…' : 'Salvando cadastro…';
  form.setAttribute('aria-busy', 'true');
  status.textContent = '';
  clearTimeout(downloadExpiryTimer);
  download.hidden = true;
  delete status.dataset.state;
  try {
    const result = await salvarLead({ ...payload, requestId, ...(downloadReceipt ? { downloadReceipt } : {}) });
    if (result.code === 'INVALID_RECEIPT') { savedDownload = undefined; lockRegisteredFields(false); }
    if (result.leadSaved === true && typeof result.downloadReceipt === 'string') {
      savedDownload = { fingerprint, receipt: result.downloadReceipt };
      lockRegisteredFields(true);
    }
    if (!result.httpOk) throw new Error(result.message || 'Não foi possível salvar seu cadastro. Seus campos foram mantidos. Tente novamente.');
    if (result.ok !== true || result.leadSaved !== true || typeof result.downloadUrl !== 'string') throw new Error('Não foi possível liberar o download. Tente novamente.');
    const url = new URL(result.downloadUrl);
    if (url.protocol !== 'https:') throw new Error('Não foi possível liberar o download. Tente novamente.');
    download.href = url.href;
    download.hidden = true;
    status.textContent = '';
    delete status.dataset.state;
    download.removeAttribute('target');
    download.setAttribute('download', 'BRANDBOOK_VIVENCIA LAB_VERSAO.pdf');
    download.textContent = 'Baixar PDF';
    download.click();

    clearTimeout(downloadExpiryTimer);
    downloadExpiryTimer = setTimeout(() => {
      download.hidden = true;
      download.removeAttribute('href');
      status.textContent = '';
      submit.textContent = 'Gerar novo link';
    }, 300000);
  } catch (error) {
    status.dataset.state = 'error';
    status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError'
      ? 'Não foi possível conectar ao cadastro. Seus campos foram mantidos. Tente novamente.'
      : error.message;
    status.scrollIntoView({ block: 'nearest' });
    status.focus({ preventScroll: true });
  } finally {
    submitting = false; submit.disabled = false; submit.textContent = savedDownload?.fingerprint === fingerprint ? (status.dataset.state === 'error' ? 'Tentar baixar PDF' : 'Gerar novo link') : status.dataset.state === 'error' ? 'Tentar novamente' : 'Baixar';
    form.removeAttribute('aria-busy');
  }
});
