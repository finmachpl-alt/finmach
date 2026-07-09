/* ===========================
   FINMACH FAKTORING WIZARD
   =========================== */

const REJESTRO_API = 'https://rejestro.io/api/v1';
// API key do konfiguracji — ustaw w zmiennej środowiskowej lub wstaw bezpośrednio
const REJESTRO_KEY = window.REJESTRO_API_KEY || '';

const state = {
  currentStep: 1,
  totalSteps: 5,
  companyData: null,
  nip: '',
  invoiceAmount: '',
  paymentTerm: '',
  invoiceCount: '',
  factoringType: '',
  jst: '',
  jstPercent: 50,
  zusArrears: false,
  zusAmount: '',
  zusStatus: '',
  usArrears: false,
  usAmount: '',
  usType: '',
  restrukturyzacja: '',
  dluznik: '',
  email: '',
  phone: '',
  consent1: false,
  consent2: false,
};

/* ============================================================
   UTILS
   ============================================================ */

function formatNip(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0,3) + '-' + digits.slice(3);
  if (digits.length <= 8) return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
  return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6,8) + '-' + digits.slice(8,10);
}

function stripNip(v) { return v.replace(/\D/g, ''); }

function validateNip(nip) {
  const n = stripNip(nip);
  if (n.length !== 10) return false;
  const w = [6,5,7,2,3,4,5,6,7];
  const sum = w.reduce((acc, wi, i) => acc + wi * parseInt(n[i], 10), 0);
  return (sum % 11) === parseInt(n[9], 10);
}

function formatAmount(v) {
  const digits = v.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function el(id) { return document.getElementById(id); }

/* ============================================================
   PROGRESS
   ============================================================ */

function updateProgress(step) {
  const pct = ((step - 1) / state.totalSteps) * 100 + 20;
  el('progressFill').style.width = Math.min(pct, 100) + '%';

  document.querySelectorAll('.progress-step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (n === step) s.classList.add('active');
    if (n < step) s.classList.add('done');
  });
}

function goToStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  const target = el(`step-${n}`) || el('step-success');
  target.classList.remove('hidden');
  state.currentStep = n;
  updateProgress(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   REJESTRO.IO API
   ============================================================ */

async function fetchCompany(nip) {
  const url = `${REJESTRO_API}/company/${nip}`;
  const headers = { 'Accept': 'application/json' };
  if (REJESTRO_KEY) headers['Authorization'] = `Bearer ${REJESTRO_KEY}`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function populateCompanyCard(data) {
  // rejestro.io response shape — dostosuj do rzeczywistej odpowiedzi API
  const d = data.data || data;

  el('companyName').textContent  = d.name || d.nazwa || '—';
  el('companyNip').textContent   = formatNip(d.nip || state.nip);
  el('companyRegon').textContent = d.regon || '—';
  el('companyKrs').textContent   = d.krs || '—';
  el('companyType').textContent  = d.legal_form || d.forma_prawna || '—';
  el('companyReg').textContent   = d.registration_date || d.data_rejestracji || '—';

  const addr = d.address || d.adres;
  el('companyAddr').textContent = addr
    ? `${addr.street || addr.ulica || ''} ${addr.city || addr.miasto || ''}`.trim()
    : '—';

  const isActive = (d.status || d.status_dzialalnosci || '').toLowerCase().includes('aktywn')
    || (d.status || '').toLowerCase() === 'active'
    || d.active === true;

  const statusDot = el('companyCard').querySelector('.company-card__status-dot');
  const statusText = el('companyStatus');
  if (isActive) {
    statusDot.classList.add('active');
    statusText.textContent = 'Aktywna';
    statusText.style.color = 'var(--success)';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = 'Nieaktywna / zawieszona';
    statusText.style.color = 'var(--warning)';
    el('companyWarnText').textContent = 'Firma może być zawieszona lub wykreślona z rejestru. Sprawdź status przed złożeniem wniosku.';
    el('companyWarn').classList.remove('hidden');
  }
}

/* ============================================================
   STEP 1 — NIP
   ============================================================ */

const nipInput = el('nip');
const nipBtn   = el('nipVerifyBtn');
const step1Next = el('step1Next');

nipInput.addEventListener('input', e => {
  const raw = e.target.value;
  const digits = stripNip(raw);
  e.target.value = formatNip(raw);

  const valid = validateNip(digits);
  nipBtn.disabled = !valid;
  nipInput.classList.toggle('error', digits.length === 10 && !valid);
  nipInput.classList.toggle('success', valid);
  el('companyCard').classList.add('hidden');
  el('nipError').classList.add('hidden');
  step1Next.disabled = true;
});

nipBtn.addEventListener('click', async () => {
  const nip = stripNip(nipInput.value);
  if (!validateNip(nip)) return;

  state.nip = nip;

  nipBtn.querySelector('.btn-text').classList.add('hidden');
  nipBtn.querySelector('.btn-spinner').classList.remove('hidden');
  nipBtn.disabled = true;
  el('companyCard').classList.add('hidden');
  el('nipError').classList.add('hidden');

  try {
    const data = await fetchCompany(nip);
    state.companyData = data;
    populateCompanyCard(data);
    el('companyCard').classList.remove('hidden');
    step1Next.disabled = false;
  } catch (err) {
    el('nipErrorText').textContent = err.message.includes('404')
      ? 'Nie znaleziono firmy o podanym NIP. Sprawdź numer i spróbuj ponownie.'
      : 'Nie udało się pobrać danych z rejestru. Spróbuj ponownie za chwilę.';
    el('nipError').classList.remove('hidden');

    // fallback — pozwól przejść dalej z ręcznym NIP
    step1Next.disabled = false;
    step1Next.querySelector
      ? step1Next.insertAdjacentHTML('beforeend', '')
      : null;
  } finally {
    nipBtn.querySelector('.btn-text').classList.remove('hidden');
    nipBtn.querySelector('.btn-spinner').classList.add('hidden');
    nipBtn.disabled = false;
  }
});

step1Next.addEventListener('click', () => goToStep(2));

/* ============================================================
   STEP 2 — Kwota
   ============================================================ */

const amountInput   = el('invoiceAmount');
const paymentSelect = el('paymentTerm');
const countSelect   = el('invoiceCount');
const typeSelect    = el('factoringType');
const step2Next     = el('step2Next');

function checkStep2() {
  const digits = state.invoiceAmount.replace(/\D/g, '');
  step2Next.disabled = !(
    digits && parseInt(digits) > 0 &&
    state.paymentTerm &&
    state.invoiceCount &&
    state.factoringType
  );
}

amountInput.addEventListener('input', e => {
  e.target.value = formatAmount(e.target.value);
  state.invoiceAmount = e.target.value;
  checkStep2();
});
paymentSelect.addEventListener('change', e => { state.paymentTerm = e.target.value; checkStep2(); });
countSelect.addEventListener('change', e => { state.invoiceCount = e.target.value; checkStep2(); });
typeSelect.addEventListener('change', e => { state.factoringType = e.target.value; checkStep2(); });

el('step2Back').addEventListener('click', () => goToStep(1));
step2Next.addEventListener('click', () => goToStep(3));

/* ============================================================
   STEP 3 — JST
   ============================================================ */

const step3Next = el('step3Next');

document.querySelectorAll('input[name="jst"]').forEach(r => {
  r.addEventListener('change', e => {
    state.jst = e.target.value;
    step3Next.disabled = false;
    const showDetail = e.target.value === 'czesc';
    el('jstDetailGroup').style.display = showDetail ? 'block' : 'none';
  });
});

el('jstPercent').addEventListener('input', e => {
  state.jstPercent = parseInt(e.target.value);
  el('jstPercentVal').textContent = e.target.value + '%';
});

el('step3Back').addEventListener('click', () => goToStep(2));
step3Next.addEventListener('click', () => goToStep(4));

/* ============================================================
   STEP 4 — Zaległości
   ============================================================ */

const zusToggle = el('zusArrears');
const usToggle  = el('usArrears');

zusToggle.addEventListener('change', e => {
  state.zusArrears = e.target.checked;
  el('zusDetail').classList.toggle('hidden', !e.target.checked);
});
usToggle.addEventListener('change', e => {
  state.usArrears = e.target.checked;
  el('usDetail').classList.toggle('hidden', !e.target.checked);
});

el('zusAmount').addEventListener('input', e => {
  e.target.value = formatAmount(e.target.value);
  state.zusAmount = e.target.value;
});
el('zusStatus').addEventListener('change', e => { state.zusStatus = e.target.value; });
el('usAmount').addEventListener('input', e => {
  e.target.value = formatAmount(e.target.value);
  state.usAmount = e.target.value;
});
el('usType').addEventListener('change', e => { state.usType = e.target.value; });

el('step4Back').addEventListener('click', () => goToStep(3));
el('step4Next').addEventListener('click', () => goToStep(5));

/* ============================================================
   STEP 5 — Restrukturyzacja
   ============================================================ */

const submitBtn = el('step5Submit');

function checkStep5() {
  submitBtn.disabled = !(
    state.restrukturyzacja &&
    state.dluznik &&
    state.email &&
    isValidEmail(state.email) &&
    state.consent1 &&
    state.consent2
  );
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

document.querySelectorAll('input[name="restrukturyzacja"]').forEach(r => {
  r.addEventListener('change', e => { state.restrukturyzacja = e.target.value; checkStep5(); });
});
document.querySelectorAll('input[name="dluznik"]').forEach(r => {
  r.addEventListener('change', e => { state.dluznik = e.target.value; checkStep5(); });
});

el('contactEmail').addEventListener('input', e => { state.email = e.target.value.trim(); checkStep5(); });
el('contactPhone').addEventListener('input', e => { state.phone = e.target.value.trim(); });
el('consent1').addEventListener('change', e => { state.consent1 = e.target.checked; checkStep5(); });
el('consent2').addEventListener('change', e => { state.consent2 = e.target.checked; checkStep5(); });

el('step5Back').addEventListener('click', () => goToStep(4));

submitBtn.addEventListener('click', async () => {
  submitBtn.querySelector('.btn-text').classList.add('hidden');
  submitBtn.querySelector('.btn-icon').classList.add('hidden');
  submitBtn.querySelector('.btn-spinner').classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    await submitWizard();
  } catch {
    /* już obsłużone */
  } finally {
    submitBtn.querySelector('.btn-text').classList.remove('hidden');
    submitBtn.querySelector('.btn-icon').classList.remove('hidden');
    submitBtn.querySelector('.btn-spinner').classList.add('hidden');
  }
});

/* ============================================================
   SUBMIT
   ============================================================ */

async function submitWizard() {
  const payload = {
    nip: state.nip,
    company: state.companyData,
    invoice: {
      monthly_amount: state.invoiceAmount.replace(/\D/g, ''),
      payment_term: state.paymentTerm,
      count: state.invoiceCount,
      type: state.factoringType,
    },
    counterparties: {
      jst: state.jst,
      jst_percent: state.jst === 'czesc' ? state.jstPercent : null,
    },
    liabilities: {
      zus: state.zusArrears ? { amount: state.zusAmount.replace(/\D/g, ''), status: state.zusStatus } : null,
      us:  state.usArrears  ? { amount: state.usAmount.replace(/\D/g, ''),  type:   state.usType   } : null,
    },
    history: {
      restructuring: state.restrukturyzacja,
      debtor_registry: state.dluznik,
    },
    contact: {
      email: state.email,
      phone: state.phone || null,
    },
    submitted_at: new Date().toISOString(),
    source: 'finmach.pl/faktoring-wizard',
  };

  // Wyślij do backend / CRM / webhook
  // await fetch('/api/factoring-leads', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });

  console.log('[Finmach] Wizard payload:', payload);

  showSuccess(payload);
}

/* ============================================================
   SUCCESS SCREEN
   ============================================================ */

function showSuccess(payload) {
  const amount = parseInt(payload.invoice.monthly_amount || 0);

  // Symulacja wyników (w produkcji zastąp danymi z backendu)
  let matchCount = 12;
  let avgRate = '0.8%';
  let topFinancer = 'eFaktor';

  if (state.zusArrears || state.usArrears) { matchCount = 7; avgRate = '1.2%'; }
  if (state.restrukturyzacja === 'trwa') { matchCount = 4; topFinancer = 'Bibby FSG'; }
  if (state.jst === 'tak') { matchCount = 15; topFinancer = 'NFG'; }
  if (amount > 500000) { matchCount += 5; avgRate = '0.65%'; }

  el('successEmail').textContent = state.email;
  el('matchCount').textContent   = matchCount;
  el('avgRate').textContent      = avgRate;
  el('topFinancer').textContent  = topFinancer;

  // Ukryj hero i progress na success
  document.querySelector('.hero').style.opacity = '0.3';
  document.querySelector('.progress-wrap').style.display = 'none';

  goToStep('success');
}

/* ============================================================
   INIT
   ============================================================ */

updateProgress(1);
