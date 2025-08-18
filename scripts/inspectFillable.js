const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const FILENAME = "Consent-for-Referral-and-Release.pdf"; // <— change if needed

(async () => {
  const p = path.join(__dirname, "..", "assets", FILENAME);
  if (!fs.existsSync(p)) {
    console.error("Missing fillable PDF at:", p);
    process.exit(1);
  }
  const bytes = fs.readFileSync(p);
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();

  const rows = [];
  const skeleton = {};
  form.getFields().forEach((field) => {
    const name = field.getName();
    const type = field.constructor && field.constructor.name || "Unknown";
    rows.push({ name, type });

    // Make a basic skeleton for this field (text default)
    skeleton[name] = "";
    try {
      if (type.includes("PDFCheckBox")) skeleton[name] = false;
      if (type.includes("PDFRadioGroup")) skeleton[name] = ""; // set to one of the radio options
      if (type.includes("PDFDropdown")) skeleton[name] = "";   // set to one of the dropdown options
      if (type.includes("PDFOptionList")) skeleton[name] = []; // multi-select
    } catch (_) {}
  });

  // Write CSV + JSON
  const csv = "name,type\n" + rows.map(r => `${r.name},${r.type}`).join("\n");
  const csvPath = path.join(__dirname, "..", "assets", "fillable-fields.csv");
  fs.writeFileSync(csvPath, csv);
  const jsonPath = path.join(__dirname, "..", "assets", "fillable-skeleton.json");
  fs.writeFileSync(jsonPath, JSON.stringify(skeleton, null, 2));

  console.log("✅ Wrote:", csvPath);
  console.log("✅ Wrote:", jsonPath);
  console.log("ℹ️  Use these names in the MAP below or send me the CSV and I’ll map them for you.");
})();
