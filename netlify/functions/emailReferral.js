const nodemailer = require('nodemailer');

const DEFAULT_RECIPIENTS = [
  // 'faisal.safelife@gmail.com',
  // 'Safelifehomehealth@gmail.com',
  'asad.safelife@gmail.com',
  'faisal.safelife@gmail.com',
  'safelifehomehealth@gmail.com',
  'usama.safelife@gmail.com',
];

function buildTransport() {
  // Configure via env vars in Netlify UI or netlify.toml [functions.environment]
  // Gmail example: SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true
  //                SMTP_USER=your@gmail.com SMTP_PASS=app_password
  const {
    SMTP_HOST,
    SMTP_PORT = '465',
    SMTP_SECURE = 'true',
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_PORT, SMTP_SECURE, SMTP_FROM).');
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const from = SMTP_FROM || `Safe Life CCP <${SMTP_USER}>`;
  return { transport, from };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const {
      filename = 'Referral_Form.pdf',
      pdfBase64,
      recipients = DEFAULT_RECIPIENTS,
      payload = {},
    } = body;

    if (!pdfBase64) {
      return { statusCode: 400, body: 'Missing pdfBase64' };
    }

    const { transport, from } = buildTransport();

    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = today.getFullYear();
    const displayDate = `${mm}/${dd}/${yyyy}`;

    const individualName = payload.individual_name || '(Unknown Individual)';
    const refDate = payload.referral_date || displayDate;
    const zip = payload.individual_zip || '';
    const emailBodyText = [
      `A new CCP referral has been generated and is attached as a PDF.`,
      ``,
      `Date: ${displayDate}`,
      `Referral Date (form): ${refDate}`,
      `Individual: ${individualName}`,
      zip ? `ZIP: ${zip}` : null,
      ``,
      `This email was sent automatically by the Safe Life CCP Referral system.`
    ].filter(Boolean).join('\n');

    const emailBodyHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">CCP Referral Generated</h2>
        <p>A new CCP referral has been generated and is attached as a PDF.</p>
        <ul>
          <li><strong>Date:</strong> ${displayDate}</li>
          <li><strong>Referral Date (form):</strong> ${refDate}</li>
          <li><strong>Individual:</strong> ${escapeHtml(individualName)}</li>
          ${zip ? `<li><strong>ZIP:</strong> ${escapeHtml(zip)}</li>` : ''}
        </ul>
        <p style="margin-top:12px;">This email was sent automatically by the Safe Life CCP Referral system.</p>
      </div>
    `;

    const info = await transport.sendMail({
      from,
      to: recipients.join(','),
      subject: 'CCP: Auto Referral Generated!',
      text: emailBodyText,
      html: emailBodyHtml,
      attachments: [
        {
          filename,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        }
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, messageId: info.messageId }),
    };
  } catch (err) {
    console.error('emailReferral error:', err);
    return { statusCode: 500, body: `Email send failed: ${err.message}` };
  }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
