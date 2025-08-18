const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const { PDFDocument, StandardFonts } = require("pdf-lib");

// ⬅️ Change if your file has a different name in /assets
const FILLABLE_NAME = "ccp-referral-fillable.pdf";

// ---------- helpers ----------
function resolveTemplate(name) {
  const candidates = [
    path.join(process.cwd(), "assets", name),
    path.join(__dirname, "../../assets", name),
    path.join(__dirname, "../assets", name),
    path.join(__dirname, "assets", name),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

function toStr(v) { return v == null ? "" : String(v); }
function truthy(v) {
  const s = String(v ?? "").toLowerCase();
  return ["1","true","yes","y","on"].includes(s);
}
function ynStr(v) {
  if (v == null) return "";
  const s = String(v).toLowerCase();
  if (["y","yes","true","1"].includes(s)) return "Yes";
  if (["n","no","false","0"].includes(s)) return "No";
  return String(v);
}

function setText(form, name, value) {
  try { form.getTextField(name).setText(toStr(value)); } catch (_) {}
}
function setCheck(form, name, on) {
  try { const f = form.getCheckBox(name); on ? f.check() : f.uncheck(); } catch (_) {}
}
function setYesNo(form, yesField, noField, value) {
  const s = String(value ?? "").toLowerCase();
  const isYes = ["1","true","yes","y","on"].includes(s);
  const isNo  = ["0","false","no","n","off"].includes(s);
  // uncheck both first
  setCheck(form, yesField, false);
  setCheck(form, noField, false);
  if (isYes) setCheck(form, yesField, true);
  else if (isNo) setCheck(form, noField, true);
}
function setTri(form, yesField, noField, unkField, value) {
  const s = String(value ?? "").toLowerCase();
  const isYes = ["1","true","yes","y","on"].includes(s);
  const isNo  = ["0","false","no","n","off"].includes(s);
  const isUnk = ["u","unk","unknown"].includes(s);
  setCheck(form, yesField, false);
  setCheck(form, noField, false);
  if (unkField) setCheck(form, unkField, false);
  if (isYes) setCheck(form, yesField, true);
  else if (isNo) setCheck(form, noField, true);
  else if (isUnk && unkField) setCheck(form, unkField, true);
}
function checkOneOf(form, mapping, value) {
  // mapping: { normalizedValue: "FieldName", ... }
  const norm = String(value ?? "").trim().toLowerCase();
  Object.entries(mapping).forEach(([key, field]) => {
    setCheck(form, field, norm === key.toLowerCase());
  });
}

// ---------- main ----------
module.exports.handler = async (event) => {
  try {
    const isGet = event.httpMethod === "GET";
    const demo = isGet && event.queryStringParameters && event.queryStringParameters.demo;
    const payload = isGet && demo ? demoData() : JSON.parse(event.body || "{}");

    const pdfPath = resolveTemplate(FILLABLE_NAME);
    if (!pdfPath) return { statusCode: 500, body: `Missing ${FILLABLE_NAME} in /assets` };

    const bytes = await fsp.readFile(pdfPath);
    const pdf = await PDFDocument.load(bytes);
    const form = pdf.getForm();
    form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));

    // ====== HEADER ======
    setText(form, "Referral Date", payload.referral_date || payload.referralDate);
    setText(form, "Referral Time", payload.referral_time || payload.time);
    setText(form, "Agency Name",  payload.agency_name || payload.agencyName);
    setText(form, "Staff person taking referral", payload.staff_person || payload.staffPerson);

    // ====== PERSON MAKING THE REFERRAL ======
    setText(form, "Name", payload.referrer_name);
    setText(form, "Phone of Referral Preparer", payload.referrer_phone);
    checkOneOf(form, { cell: "Cell", home: "Home", work: "Work" }, payload.referrer_phone_type);
    setText(form, "Email of Referral Preparer", payload.referrer_email);
    setText(form, "Relationship to Individual in need of supports and services", payload.referrer_relationship);

    // ====== INDIVIDUAL ======
    setText(form, "Name_2", payload.individual_name);
    setText(form, "Age", payload.individual_age);
    setText(form, "Date of Birth", payload.individual_dob);

    setText(form, "Address",  payload.individual_address);
    setText(form, "City",     payload.individual_city);
    setText(form, "Zip Code", payload.individual_zip);
    setText(form, "County",   payload.individual_county);

    setText(form, "Phone of Client", payload.individual_phone);
    setText(form, "Email_2", payload.individual_email);
    setText(form, "If not Englishspeaking preferred language", payload.individual_pref_language);

    setYesNo(form, "Lives_Alone_Yes", "Lives_Alone_No", payload.individual_lives_alone);
    setYesNo(form, "Safety Issue_Yes", "Safety_issue_No", payload.individual_safety_issues);
    setText(form, "What Safety Issue?", payload.individual_safety_desc);

    // ====== FACILITY ======
    setText(form, "Facility Name", payload.facility_name);
    setText(form, "Facility Address", payload.facility_address);

    // facility_type can be a string or array; check multiple if array
    let ftypes = payload.facility_type;
    if (!Array.isArray(ftypes)) ftypes = [String(ftypes || "")];
    const fStr = ftypes.join(" | ").toLowerCase();
    setCheck(form, "Assisted Living", /assisted/.test(fStr));
    setCheck(form, "Supportive Living Program", /supportive/.test(fStr));
    setCheck(form, "Longterm Care Facility Nursing Home", /(long|nursing)/.test(fStr));
    setCheck(form, "Hospital", /hospital/.test(fStr));
    setCheck(form, "Hospice Facility", /hospice/.test(fStr));
    const isOther = /other/.test(fStr) || !!payload.facility_other_name;
    setCheck(form, "Other Name", !!isOther);
    if (isOther) setText(form, "Other Facility Name", payload.facility_other_name || payload.facility_type);

    // ====== SPOUSE & CAREGIVER ======
    setYesNo(form, "Spouse_Yes", "Spouse_No", payload.has_spouse);
    setText(form, "If yes Spouse Name", payload.spouse_name);
    setYesNo(form, "Spouse needs services_Yes", "Spouse needs services_No", payload.spouse_needs_services);
    setText(form, "Age of spouse", payload.spouse_age);

    setYesNo(form, "Friend/Family Caregiver_Yes", "Friend_Family Caregiver_No",
      payload.has_caregiver ?? payload.caregiver_exists);
    setText(form, "If yes provide contact information if known", payload.caregiver_contact);

    // ====== REPRESENTATION ======
    setTri(form, "L_G_Yes",  "L_G_No",  "L_G_Unk",  payload.legal_guardian);
    setTri(form, "Rep_Yes",  "Rep_No",  "Rep_Unk",  payload.representative_payee);
    setTri(form, "POA_Yes",  "POA_No",  "POA_Unk",  payload.poa_health);
    setTri(form, "POAF_Yes", "POAF_No", "POAF_Unk", payload.poa_financial);

    if (payload.rep_contact) {
      setText(form, "If yes provide contact information if known_2", payload.rep_contact);
      setText(form, "If yes provide contact information if known_3", payload.rep_contact);
    }

    // ====== OTHER PERSON IN HOME ======
    setYesNo(form, "Any other needs service_Yes", "Any other needs service_No", payload.other_person_exists);
    setText(form, "Name of other individual if known", payload.other_person_name);
    setText(form, "Age of other individual if known", payload.other_person_age);

    // ====== HEALTH ======
    setTri(form, "Hearing_loss_Yes", "Hearing_loss_No", "Hearing_loss_Unk", payload.hearing_loss);
    // note: PDF field is "Vission_loss_Yes" (spelling in form)
    setTri(form, "Vission_loss_Yes", "Vision_loss_No", "Vision_loss_Unk", payload.vision_issues);
    setTri(form, "Alz_Yes", "Alz_No", "Alz_Unk", payload.alz_dementia);
    setTri(form, "MHI_Yes", "MHI_No", "MHI_Unk", payload.mental_health);
    setTri(form, "Dis_Yes", "Dis_No", "Dis_Unk", payload.physical_disability);
    setTri(form, "I/D_Yes", "I/D_No", "I/D_Unk", payload.intellectual_dev_disability ?? payload.idd);
    setTri(form, "BI_Yes", "BI_No", "BI_Unk", payload.brain_injury);
    setText(form, "If yes preferred method of communication ie Interpreter TTY Relay Services or Braille Assistance",
      payload.pref_comm_method);

    // ====== CURRENT SERVICES & PROBLEMS ======
    setText(form, "Reason for Referral general concerns", payload.reason_for_referral);
    setYesNo(form, "Receive any support_Yes", "Receive any support_No", payload.receives_services);
    setText(form, "What support and services does the client recieve now?", payload.types_services || payload.current_services_types);

    setYesNo(form, "Problem with current support_Yes", "Problem with current support_No", payload.problems_with_services);
    setText(form, "Explain the problems with current support", payload.problems_explain);

    // ====== MORE QUESTIONS ======
    setYesNo(form, "Mil_Yes", "Mil_No", payload.military_service);
    setTri(form, "Aware_yes", "Aware_No", "Aware_Unk", payload.aware_of_referral);
    setTri(form, "Danger_Yes", "Danger_No", "Danger_Unk", payload.immediate_danger);
    setText(form, "Is the Individual in immediate danger Yes No Unknown Explain", payload.danger_explain);

    setYesNo(form, "Imm_Assistance_Yes", "Imm_Assistance_No", payload.immediate_assistance);
    setText(form, "Is the Individual in need of immediate assistance Yes No Explain", payload.assist_explain);

    setYesNo(form, "Someone Present at time of visit (Yes)", "Someone Present at time of visit (No)",
      payload.wants_someone_present);
    setText(form, "Who does the client wants to be present at time of visit?", payload.who_present);

    setText(form, "Best Time to Contact", payload.best_time);
    setText(form, "Best Phone to contact", payload.best_phone);
    setText(form, "Best Email to contact", payload.best_email);

    // Flatten the output so it renders consistently everywhere
    form.flatten();

    const out = await pdf.save();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Referral-Filled.pdf"',
      },
      body: Buffer.from(out).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Error: " + e.message };
  }
};

// ---------- thorough demo payload (touches *every* field) ----------
function demoData() {
  return {
    // Header
    referral_date: "2025-08-12",
    referral_time: "14:30",
    agency_name: "Safe Life Home Health Care",
    staff_person: "Asad Ali",

    // Person making referral
    referrer_name: "John Doe",
    referrer_phone: "312-555-0100",
    referrer_phone_type: "Cell", // Cell | Home | Work
    referrer_email: "john@example.com",
    referrer_relationship: "Daughter",

    // Individual
    individual_name: "Jane Smith",
    individual_age: "79",
    individual_dob: "1946-01-10",
    individual_address: "101 W 22nd St, Apt 4B",
    individual_city: "Chicago",
    individual_zip: "60616",
    individual_county: "Cook",
    individual_phone: "773-555-2222",
    individual_email: "jane.smith@example.com",
    individual_pref_language: "English",
    individual_lives_alone: "Yes",
    individual_safety_issues: "Yes",
    individual_safety_desc: "Large dog on premises.",

    // Facility (exercise multiple boxes incl. Other)
    facility_name: "Sunrise Residence",
    facility_address: "2000 N Example Ave, Chicago, IL",
    facility_type: ["Supportive Living Program", "Hospice Facility", "Other"],
    facility_other_name: "Memory Care Wing",

    // Spouse & caregiver
    has_spouse: "Yes",
    spouse_name: "Robert Smith",
    spouse_needs_services: "No",
    spouse_age: "82",
    has_caregiver: "Yes",
    caregiver_contact: "Mary Smith (POA), 312-555-1001",

    // Representation
    legal_guardian: "Yes",
    representative_payee: "No",
    poa_health: "Yes",
    poa_financial: "Unknown",
    rep_contact: "POA: Mary Smith, mary@example.com",

    // Other person in home
    other_person_exists: "Yes",
    other_person_name: "Grandson: Luke",
    other_person_age: "14",

    // Health section
    hearing_loss: "Unknown",
    vision_issues: "Yes",       // PDF uses Vission_loss_Yes / Vision_loss_No / Vision_loss_Unk
    alz_dementia: "Unknown",
    mental_health: "No",
    physical_disability: "Yes",
    intellectual_dev_disability: "No",
    brain_injury: "Yes",
    pref_comm_method: "Phone (TTY if needed)",

    // Current services & problems
    reason_for_referral: "Needs home support with ADLs and light housekeeping.",
    receives_services: "Yes",
    types_services: "Meals on Wheels; nurse visits weekly",
    problems_with_services: "Yes",
    problems_explain: "Service days occasionally missed; needs medication reminders",

    // Other questions
    military_service: "No",
    aware_of_referral: "Yes",
    immediate_danger: "No",
    danger_explain: "N/A",
    immediate_assistance: "Yes",
    assist_explain: "Needs urgent home safety assessment",

    wants_someone_present: "Yes",
    who_present: "Daughter (Mary Smith)",
    best_time: "Weekday mornings",
    best_phone: "773-555-2222",
    best_email: "jane.smith@example.com",
  };
}