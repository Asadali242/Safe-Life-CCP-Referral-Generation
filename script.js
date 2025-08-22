let currentStep = 0;
const steps = document.querySelectorAll('.step');
// Last step is the Thank You screen, so exclude it from progress math
const totalSteps = steps.length - 1;

document.addEventListener('DOMContentLoaded', () => {
  updateProgressBar();
  initSignaturePad('clientSignature');
  initSignaturePad('agencySignature');

  // Clear buttons
  document.querySelectorAll('.sig-clear').forEach(btn => {
    btn.addEventListener('click', () => clearSignature(btn.dataset.target));
  });

  // Live clear of field-level errors as the user types/selects
  document.addEventListener('input', onFieldInput);
  document.addEventListener('change', onFieldInput);
});

// ---------- Navigation & Progress ----------
function nextStep() {
  if (currentStep < totalSteps) {
    steps[currentStep].classList.remove('active');
    currentStep++;
    steps[currentStep].classList.add('active');
    onStepActivated(currentStep);
    updateProgressBar();
    window.scrollTo({ top: steps[currentStep].offsetTop - 24, behavior: 'smooth' });
  }
}
function prevStep() {
  if (currentStep > 0) {
    steps[currentStep].classList.remove('active');
    currentStep--;
    steps[currentStep].classList.add('active');
    onStepActivated(currentStep);
    updateProgressBar();
    window.scrollTo({ top: steps[currentStep].offsetTop - 24, behavior: 'smooth' });
  }
}
function onStepActivated(idx) {
  const section = steps[idx];
  // Ensure canvases get sized once visible
  if (section && section.id === 'consentStep') {
    signaturePads.clientSignature?.ensureVisibleSize?.();
    signaturePads.agencySignature?.ensureVisibleSize?.();
  }
}
function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('stepIndicator');
  if (!bar || !label) return;

  const pct = currentStep >= totalSteps ? 100 : (currentStep / totalSteps) * 100;
  bar.style.width = `${pct}%`;
  label.textContent = `Step ${Math.min(currentStep + 1, totalSteps)} of ${totalSteps}`;
}

// ---------- Inline error helpers ----------
function getOrCreateFieldErrorEl(el) {
  const next = el.nextElementSibling;
  if (next && next.classList && next.classList.contains('error-message')) return next;
  const p = document.createElement('p');
  p.className = 'error-message';
  p.id = (el.id ? `${el.id}Error` : `${el.name || 'field'}Error`);
  el.insertAdjacentElement('afterend', p);
  return p;
}
function showFieldError(el, msg) {
  const err = getOrCreateFieldErrorEl(el);
  err.textContent = msg;
  err.style.display = 'block';
  el.setAttribute('aria-invalid', 'true');
}
function clearFieldError(el) {
  if (!el) return;
  const sib = el.nextElementSibling;
  const err = (sib && sib.classList?.contains('error-message'))
    ? sib
    : document.getElementById((el.id || el.name || 'field') + 'Error');
  if (err) { err.textContent = ''; err.style.display = 'none'; }
  el.removeAttribute('aria-invalid');
}
function getOrCreateGroupErrorEl(fs) {
  let err = fs.querySelector(':scope > .error-message');
  if (!err) {
    err = document.createElement('p');
    err.className = 'error-message';
    fs.appendChild(err);
  }
  return err;
}
function showGroupError(fs, msg) {
  const err = getOrCreateGroupErrorEl(fs);
  err.textContent = msg;
  err.style.display = 'block';
  fs.setAttribute('aria-invalid', 'true');
}
function clearGroupError(fs) {
  const err = fs.querySelector(':scope > .error-message');
  if (err) { err.textContent = ''; err.style.display = 'none'; }
  fs.removeAttribute('aria-invalid');
}

// When user types/selects, clear any inline error for that control or its required group
function onFieldInput(e) {
  const el = e.target;
  if (!el) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
    clearFieldError(el);
  }
  const fs = el.closest('fieldset[data-required-group="true"]');
  if (fs) {
    const anyChecked = fs.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
    if (anyChecked) clearGroupError(fs);
  }
}

// ---------- Validation helpers ----------
function isPastDateISO(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}
function yearsBetweenISOToToday(dobISO) {
  const d = new Date(dobISO);
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let y = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) y--;
  return y;
}

// ---------- Signature Pads ----------
const signaturePads = {}; // { id: { canvas, ctx, dpr, drawing, lastX, lastY, hasInk, resize, ensureVisibleSize } }

function initSignaturePad(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function sizeToVisibleRect() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false; // hidden
    const needW = Math.round(rect.width * dpr);
    const needH = Math.round(rect.height * dpr);
    if (canvas.width !== needW || canvas.height !== needH) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.width = needW;
      canvas.height = needH;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      signaturePads[id].hasInk = false;
    }
    return true;
  }

  function resize() { sizeToVisibleRect(); }
  function ensureVisibleSize() { sizeToVisibleRect(); }

  signaturePads[id] = {
    canvas, ctx, dpr,
    drawing: false, lastX: 0, lastY: 0,
    hasInk: false,
    resize, ensureVisibleSize
  };

  // Initial sizing attempt (will no-op if hidden)
  resize();
  window.addEventListener('resize', resize);

  const start = (x, y) => {
    const s = signaturePads[id];
    s.ensureVisibleSize(); // make sure the canvas is sized once visible
    s.drawing = true;
    s.lastX = x;
    s.lastY = y;
  };
  const move = (x, y) => {
    const s = signaturePads[id];
    if (!s.drawing) return;
    s.hasInk = true;
    s.ctx.lineCap = 'round';
    s.ctx.lineJoin = 'round';
    s.ctx.strokeStyle = '#0d4052';
    s.ctx.lineWidth = 2.2;
    s.ctx.beginPath();
    s.ctx.moveTo(s.lastX, s.lastY);
    s.ctx.lineTo(x, y);
    s.ctx.stroke();
    s.lastX = x;
    s.lastY = y;
  };
  const end = () => signaturePads[id].drawing = false;

  // Mouse
  canvas.addEventListener('mousedown', e => start(e.offsetX, e.offsetY));
  canvas.addEventListener('mousemove', e => move(e.offsetX, e.offsetY));
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);

  // Touch
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    start(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    move(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('touchend', end);
}

function clearSignature(id) {
  const s = signaturePads[id];
  if (!s) return;
  s.ctx.setTransform(1,0,0,1,0,0);
  s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
  s.hasInk = false;
  s.ctx.scale(s.dpr, s.dpr);
}

function signatureDataUrl(id) {
  const s = signaturePads[id];
  if (!s) return '';
  return s.canvas.toDataURL('image/png');
}

// ---------- Step Validation (INLINE) ----------
function validateStep() {
  const section = steps[currentStep];

  let firstInvalid = null;

  // 1) Required single inputs/selects/textareas in this step
  const required = Array.from(section.querySelectorAll('input[required], select[required], textarea[required]'));
  required.forEach(el => {
    const v = (el.value || '').trim();
    if (!v) {
      if (!firstInvalid) firstInvalid = el;
      showFieldError(el, 'This field is required.');
    }
  });

  // 2) Required radio/checkbox groups
  const groups = Array.from(section.querySelectorAll('fieldset[data-required-group="true"]'));
  groups.forEach(fs => {
    const anyChecked = fs.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
    if (!anyChecked) {
      if (!firstInvalid) {
        const firstControl = fs.querySelector('input');
        firstInvalid = firstControl || fs;
      }
      showGroupError(fs, 'Please make a selection.');
    }
  });

  // 3) Pattern & logic validations for this step only
  if (currentStep === 0) {
    const dobEl = document.getElementById('individual_dob');
    if (dobEl) {
      const dob = dobEl.value;
      if (!dob || !isPastDateISO(dob)) {
        if (!firstInvalid) firstInvalid = dobEl;
        showFieldError(dobEl, 'Date of birth must be a valid past date.');
      }
    }

    const addrEl = document.getElementById('individual_address');
    if (addrEl && addrEl.value.trim().length < 5) {
      if (!firstInvalid) firstInvalid = addrEl;
      showFieldError(addrEl, 'Please enter a full street address.');
    }

    const cityEl = document.getElementById('individual_city');
    if (cityEl && !/^[A-Za-z .\'-]{2,}$/.test(cityEl.value.trim())) {
      if (!firstInvalid) firstInvalid = cityEl;
      showFieldError(cityEl, 'Enter a valid city name.');
    }

    const zipEl = document.getElementById('individual_zip');
    if (zipEl && !/^\d{5}(-\d{4})?$/.test(zipEl.value.trim())) {
      if (!firstInvalid) firstInvalid = zipEl;
      showFieldError(zipEl, 'Enter a valid ZIP (12345 or 12345-6789).');
    }

    const countyEl = document.getElementById('individual_county');
    if (countyEl && !/^[A-Za-z .\'-]{2,}$/.test(countyEl.value.trim())) {
      if (!firstInvalid) firstInvalid = countyEl;
      showFieldError(countyEl, 'Enter a valid county.');
    }

    const phoneEl = document.getElementById('individual_phone');
    if (phoneEl && !/^\d{10}$|^\d{3}-\d{3}-\d{4}$/.test(phoneEl.value.trim())) {
      if (!firstInvalid) firstInvalid = phoneEl;
      showFieldError(phoneEl, 'Use 1234567890 or 123-456-7890.');
    }

    const emailEl = document.getElementById('individual_email');
    if (emailEl && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i.test(emailEl.value.trim())) {
      if (!firstInvalid) firstInvalid = emailEl;
      showFieldError(emailEl, 'Enter a valid email address.');
    }
  }

  // Consent step specifics
  if (section.id === 'consentStep') {
    const agree = document.getElementById('consentAgree');
    const agreeErr = document.getElementById('consentAgreeError');
    const sigErr = document.getElementById('consentSigError');
    if (agreeErr) { agreeErr.textContent = ''; agreeErr.style.display = 'none'; }
    if (sigErr) { sigErr.textContent = ''; sigErr.style.display = 'none'; }

    if (!agree.checked) {
      if (!firstInvalid) firstInvalid = agree;
      agreeErr.textContent = 'Please confirm you agree to the consent terms.';
      agreeErr.style.display = 'block';
    }
    if (!signaturePads.clientSignature?.hasInk || !signaturePads.agencySignature?.hasInk) {
      sigErr.textContent = 'Please provide both signatures before submitting.';
      sigErr.style.display = 'block';
      if (!firstInvalid) firstInvalid = document.getElementById('clientSignature');
    }
  }

  if (firstInvalid) {
    if (firstInvalid.focus) firstInvalid.focus();
    const y = firstInvalid.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
    return false;
  }

  nextStep();
  return true;
}

// ---------- Payload Helpers ----------
function getRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : '';
}
function getCheckboxGroup(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}
function val(id) {
  const el = document.getElementById(id);
  return el ? (el.value || '') : '';
}

function formatLocalDateMMDDYYYY(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
function formatISOToMMDDYYYY(iso) {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${mm.padStart(2, '0')}/${dd.padStart(2, '0')}/${yyyy}`;
}
function formatLocalTimeHHMM(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function yearsBetweenISO(dobISO) {
  const y = yearsBetweenISOToToday(dobISO);
  return (y == null || y < 0 || y > 120) ? '' : String(y);
}

function buildPayload() {
  const now = new Date();
  const autoReferralDate = formatLocalDateMMDDYYYY(now); // MM/DD/YYYY
  const autoReferralTime = formatLocalTimeHHMM(now);      // HH:MM

  const dobISO = val('individual_dob');
  const dobMMDDYYYY = formatISOToMMDDYYYY(dobISO);
  const computedAge = yearsBetweenISO(dobISO);            // auto age

  const clientSig = signatureDataUrl('clientSignature');
  const agencySig = signatureDataUrl('agencySignature');

  return {
    // Header (auto)
    referral_date: autoReferralDate,
    referral_time: autoReferralTime,
    agency_name: "Safe Life Home Health Care",
    staff_person: "Intake Team",

    // Referrer (auto)
    referrer_name: "Rai Faisal Aslam",
    referrer_phone: "224-344-3977",
    referrer_phone_type: "Cell",
    referrer_email: "faisal.safelife@gmail.com",
    referrer_relationship: "Home Care Provider Agency",

    // Individual (first visible step)
    individual_name: val('individual_name'),
    individual_age: computedAge,
    individual_dob: dobMMDDYYYY,
    individual_address: val('individual_address'),
    individual_city: val('individual_city'),
    individual_zip: val('individual_zip'),
    individual_county: val('individual_county'),
    individual_phone: val('individual_phone'),
    individual_email: val('individual_email'),
    individual_pref_language: val('individual_pref_language'),
    individual_lives_alone: getRadio('individual_lives_alone'),
    individual_safety_issues: getRadio('individual_safety_issues'),
    individual_safety_desc: val('individual_safety_desc'),

    // Facility (optional)
    facility_name: val('facility_name'),
    facility_address: val('facility_address'),
    facility_type: getCheckboxGroup('facility_type'),
    facility_other_name: val('facility_other_name'),

    // Spouse & Caregiver
    has_spouse: getRadio('has_spouse'),
    spouse_name: val('spouse_name'),
    spouse_needs_services: getRadio('spouse_needs_services'),
    spouse_age: val('spouse_age'),
    has_caregiver: getRadio('has_caregiver'),
    caregiver_contact: val('caregiver_contact'),

    // Representation
    legal_guardian: getRadio('legal_guardian'),
    representative_payee: getRadio('representative_payee'),
    poa_health: getRadio('poa_health'),
    poa_financial: getRadio('poa_financial'),
    rep_contact: val('rep_contact'),

    // Other
    other_person_exists: getRadio('other_person_exists'),
    other_person_name: val('other_person_name'),
    other_person_age: val('other_person_age'),

    // Health
    hearing_loss: getRadio('hearing_loss'),
    vision_issues: getRadio('vision_issues'),
    alz_dementia: getRadio('alz_dementia'),
    mental_health: getRadio('mental_health'),
    physical_disability: getRadio('physical_disability'),
    intellectual_dev_disability: getRadio('intellectual_dev_disability'),
    brain_injury: getRadio('brain_injury'),
    pref_comm_method: val('pref_comm_method'),

    // Services & Problems
    reason_for_referral: val('reason_for_referral'),
    receives_services: getRadio('receives_services'),
    types_services: val('types_services'),
    problems_with_services: getRadio('problems_with_services'),
    problems_explain: val('problems_explain'),

    // More Questions
    military_service: getRadio('military_service'),
    aware_of_referral: getRadio('aware_of_referral'),
    immediate_danger: getRadio('immediate_danger'),
    danger_explain: val('danger_explain'),
    immediate_assistance: getRadio('immediate_assistance'),
    assist_explain: val('assist_explain'),
    wants_someone_present: getRadio('wants_someone_present'),
    who_present: val('who_present'),

    // Contact
    best_time: val('best_time'),
    best_phone: val('best_phone'),
    best_email: val('best_email'),

    // Consent
    consent_agree: document.getElementById('consentAgree')?.checked || false,
    consent_client_signature: clientSig,
    consent_agency_signature: agencySig,
  };
}

// ---------- PDF & Email Helpers ----------
const FN = (name) => new URL(`/.netlify/functions/${name}`, location.origin).toString();

async function fetchPdf(functionName, payload) {
  const res = await fetch(FN(functionName), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // keepalive isn't reliable for large bodies; functions return small PDFs/blobs so OK here
  });
  if (!res.ok) throw new Error(`${functionName} responded ${res.status}`);
  return await res.blob();
}
function sanitizeFileName(name) {
  if (!name) return 'Referral_Form';
  return name.replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '_');
}
async function combinePdfsToBytes(referralBlob, consentBlob) {
  const { PDFDocument } = window.PDFLib;
  const [refArr, conArr] = await Promise.all([referralBlob.arrayBuffer(), consentBlob.arrayBuffer()]);
  const [refDoc, conDoc] = await Promise.all([PDFDocument.load(refArr), PDFDocument.load(conArr)]);
  const outDoc = await PDFDocument.create();
  const refPages = await outDoc.copyPages(refDoc, refDoc.getPageIndices());
  refPages.forEach(p => outDoc.addPage(p));
  const conPages = await outDoc.copyPages(conDoc, conDoc.getPageIndices());
  conPages.forEach(p => outDoc.addPage(p));
  return await outDoc.save(); // Uint8Array
}
function downloadBytesAsPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function abToBase64(arrBuf) {
  let binary = '';
  const bytes = new Uint8Array(arrBuf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Await email send (with small retry) BEFORE triggering the download.
// This prevents the browser from canceling the request when the user navigates or the download starts.
async function emailMergedPdf(pdfBytes, filename, payload) {
  const base64 = abToBase64(pdfBytes);
  const body = JSON.stringify({ filename, pdfBase64: base64, payload });

  // one attempt + one quick retry after 1s if it fails for transient reasons
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(FN('emailReferral'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) return true;
      const txt = await res.text();
      console.warn(`Email attempt ${attempt} failed:`, txt);
    } catch (err) {
      console.warn(`Email attempt ${attempt} error:`, err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function emailThenDownload(referralBlob, consentBlob, filename, payload) {
  const bytes = await combinePdfsToBytes(referralBlob, consentBlob);

  // Show small status to user while emailing (optional)
  const submitBtn = document.querySelector('#leadForm button[type="submit"]');
  const origText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) submitBtn.textContent = 'Emailing…';

  const ok = await emailMergedPdf(bytes, filename, payload);

  if (submitBtn) submitBtn.textContent = ok ? 'Downloading…' : 'Downloading (email failed)…';

  // Always let the user download even if email failed
  downloadBytesAsPdf(bytes, filename);

  // Restore button text shortly after
  if (submitBtn) setTimeout(() => { submitBtn.textContent = 'Generate PDF'; }, 800);

  if (!ok) {
    // Non-blocking notice
    console.error('Email send failed after retries. Check Netlify function logs.');
    alert('The PDF downloaded, but emailing it failed. Please try again or contact support.');
  }
}

// ---------- Submit & Restart ----------
function restartForm() {
  const form = document.getElementById('leadForm');
  form.reset();
  steps[currentStep].classList.remove('active');
  currentStep = 0;
  steps[currentStep].classList.add('active');
  updateProgressBar();
  document.querySelectorAll('.error-message').forEach(e => { e.textContent=''; e.style.display='none'; });
  clearSignature('clientSignature');
  clearSignature('agencySignature');
}

document.getElementById('leadForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  // Validate the final step inline too (agree + signatures)
  if (currentStep < totalSteps && validateStep() === false) return;

  const submitButton = this.querySelector('button[type="submit"]');
  if (submitButton?.disabled) return;
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Generating…"; }

  const payload = buildPayload();

  try {
    const [referralBlob, consentBlob] = await Promise.all([
      fetchPdf('fillReferralPdf', payload),
      fetchPdf('fillConsentPdf', payload),
    ]);

    const baseName = sanitizeFileName(payload.individual_name);
    const filename = `${baseName || 'Referral'}_Referral_Form.pdf`;

    // UPDATED: Await email first, then download
    await emailThenDownload(referralBlob, consentBlob, filename, payload);

    steps[currentStep].classList.remove('active');
    currentStep = totalSteps;
    steps[currentStep].classList.add('active');
    updateProgressBar();
  } catch (err) {
    console.error('Error generating PDFs or emailing:', err);
    alert('Sorry, something went wrong while generating your PDF. Please try again.');
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = "Generate PDF"; }
  }
});

// Keyboard nav
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') validateStep();
  if (e.key === 'ArrowLeft') prevStep();
});

// Service worker (if present)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.error('Service Worker Failed:', err));
}