const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const CONSENT_TEMPLATES = [
  'Consent-for-Referral-and-Release.pdf',
  'Consent for Referral and Release.pdf',
];

// --- find the consent template in /assets ---
function resolveConsentTemplate() {
  const assetsDir = path.resolve(__dirname, '../../assets');
  for (const name of CONSENT_TEMPLATES) {
    const p = path.join(assetsDir, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Consent PDF not found in /assets. Looked for: ${CONSENT_TEMPLATES.join(', ')}`
  );
}

// --- robust loader for ccu_lookup.json, works locally & on Netlify ---
function readCCULookup() {
  // Try Netlify’s lambda root, project root, and function-relative paths
  const candidates = [
    path.resolve(process.env.LAMBDA_TASK_ROOT || '', 'ccu_lookup.json'),
    path.resolve(process.cwd(), 'ccu_lookup.json'),
    path.resolve(__dirname, '../../ccu_lookup.json'),
    path.resolve(__dirname, '../../../ccu_lookup.json'),
  ];
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch (_) {}
  }
  return {};
}

// ---------- helpers ----------
function setIfPresent(form, fieldName, value) {
  const v = value == null ? '' : String(value);
  try {
    form.getTextField(fieldName).setText(v);
    return true;
  } catch {
    return false;
  }
}
function safeJoin(parts, sep = ', ') {
  return parts.filter(Boolean).join(sep);
}
function formatLocalDateMMDDYYYY(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
function dataUrlToBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const idx = dataUrl.indexOf(',');
  if (idx === -1) return null;
  return Buffer.from(dataUrl.slice(idx + 1), 'base64');
}
function normalizeZip(z) {
  if (!z) return '';
  // keep only digits, first 5
  return String(z).replace(/\D/g, '').slice(0, 5);
}
// Split comma/semicolon/or/& separated phone strings into an ordered list
function splitPhones(str) {
  if (!str) return [];
  return String(str)
    .split(/[,;/]|(?:\s+or\s+)|(?:\s*&\s*)/i)
    .map(s => s.trim())
    .filter(Boolean);
}

// Draw a PNG into the rectangle of a form field
async function drawSignatureOnField(pdfDoc, form, fieldNames, pngBytes, pad = 2) {
  if (!pngBytes) return false;

  // locate the first existing field by these names
  let fieldObj = null;
  for (const n of fieldNames) {
    try {
      fieldObj = form.getField(n);
      if (fieldObj) break;
    } catch {}
  }
  if (!fieldObj) return false;

  const acro = fieldObj.acroField;
  const widgets = acro.getWidgets ? acro.getWidgets() : [];
  if (!widgets || widgets.length === 0) return false;

  const pages = pdfDoc.getPages();
  const png = await pdfDoc.embedPng(pngBytes);

  for (const w of widgets) {
    let rect, page;
    try { rect = w.getRectangle(); } catch { continue; }
    try {
      const pref = w.getP ? w.getP() : (w.P ? w.P() : null);
      page = pages.find(p => p.ref === pref) || pages[0];
    } catch { page = pages[0]; }
    if (!rect || !page) continue;

    const targetW = Math.max(0, rect.width - pad * 2);
    const targetH = Math.max(0, rect.height - pad * 2);
    const { width: iw, height: ih } = png.scale(1);
    const s = Math.min(targetW / iw, targetH / ih);
    const drawW = iw * s;
    const drawH = ih * s;
    const x = rect.x + (rect.width - drawW) / 2;
    const y = rect.y + (rect.height - drawH) / 2;

    page.drawImage(png, { x, y, width: drawW, height: drawH });
  }
  return true;
}

// Exact signature field names you provided:
const CLIENT_SIG_FIELDS = ['Signature Block70_es_:signer:signatureblock'];
const AGENCY_SIG_FIELDS = ['Signature Block71_es_:signer:signatureblock'];

function ccuOutputsFromZip(zip, lookup) {
  const rec = lookup[zip] || null;
  if (!rec) return { name: '', contact: '', contact2: '' };

  const name = (rec.ccu_name || '').trim();
  const email = (rec.ccu_email || '').trim();
  const phones = splitPhones(rec.ccu_phone);

  let contact = '';
  let contact2 = '';

  if (email) {
    contact = email;
    contact2 = phones[0] || '';
  } else {
    contact = phones[0] || '';
    contact2 = phones[1] || '';
  }

  return { name, contact, contact2 };
}

async function fillConsent(payload) {
  const consentPath = resolveConsentTemplate();
  const inputBytes = fs.readFileSync(consentPath);
  const pdfDoc = await PDFDocument.load(inputBytes);
  const form = pdfDoc.getForm();

  // Compose address & basics
  const street = payload.individual_address || '';
  const city   = payload.individual_city || '';
  const county = payload.individual_county || '';
  const zipRaw = payload.individual_zip || '';
  const zip    = normalizeZip(zipRaw);
  const cityCounty = safeJoin([city, county], ', ');
  const fullAddress = safeJoin([street, cityCounty, zip], ' ');

  const telephone = payload.individual_phone || '';
  const cell = payload.best_phone || payload.individual_phone || '';
  const dateForConsent = payload.referral_date || formatLocalDateMMDDYYYY(new Date());

  // ---- Fill client/agency basics ----
  setIfPresent(form, 'client_Name', payload.individual_name);
  setIfPresent(form, 'client_Address', fullAddress);
  setIfPresent(form, 'client_Email', payload.individual_email);
  setIfPresent(form, 'client_Telephone', telephone);
  setIfPresent(form, 'client_Cell', cell);
  setIfPresent(form, 'Reasons for Referral', payload.reason_for_referral);
  setIfPresent(form, 'Date', dateForConsent);
  setIfPresent(form, 'Title of the Agency Representative', 'Intake Team');

  // ---- CCU fields from ZIP via ccu_lookup.json ----
  const lookup = readCCULookup();
  const outs = ccuOutputsFromZip(zip, lookup);
  setIfPresent(form, 'CCU_Name', outs.name);
  setIfPresent(form, 'CCU_contact', outs.contact);
  setIfPresent(form, 'CCU_contact_2', outs.contact2);

  // ---- Signatures ----
  const clientSigBytes = dataUrlToBytes(payload.consent_client_signature);
  const agencySigBytes = dataUrlToBytes(payload.consent_agency_signature);

  if (clientSigBytes) {
    await drawSignatureOnField(pdfDoc, form, CLIENT_SIG_FIELDS, clientSigBytes, 2);
  }
  if (agencySigBytes) {
    await drawSignatureOnField(pdfDoc, form, AGENCY_SIG_FIELDS, agencySigBytes, 2);
  }

  // Flatten for reliability
  form.flatten();
  return await pdfDoc.save();
}

// ---------- Netlify handler ----------
exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      // Manual test — choose a ZIP that exists in your lookup (e.g., 60148 has email+phones)
      const now = new Date();
      const payload = {
        referral_date: formatLocalDateMMDDYYYY(now),
        individual_name: 'Jane Doe',
        individual_address: '101 W 22nd St STE 202',
        individual_city: 'Lombard',
        individual_county: 'DuPage',
        individual_zip: '60148',
        individual_email: 'jane.doe@example.com',
        individual_phone: '224-555-0199',
        best_phone: '224-555-0100',
        reason_for_referral: 'Needs assistance with in-home care and transportation.',
        // 1x1 transparent PNG placeholders for signatures
        consent_client_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAukBdy9d2WkAAAAASUVORK5CYII=',
        consent_agency_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAukBdy9d2WkAAAAASUVORK5CYII='
      };
      const pdf = await fillConsent(payload);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Consent-Filled.pdf"',
        },
        body: Buffer.from(pdf).toString('base64'),
        isBase64Encoded: true,
      };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const payload = JSON.parse(event.body || '{}');
    const pdf = await fillConsent(payload);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Consent-Filled.pdf"',
      },
      body: Buffer.from(pdf).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('fillConsentPdf error:', err);
    return { statusCode: 500, body: `Error generating consent PDF: ${err.message}` };
  }
};
