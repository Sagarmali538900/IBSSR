import nodemailer from 'nodemailer';

/**
 * Sends a real email using SMTP configuration from environment variables.
 * Falls back to console log if SMTP credentials are not set.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content
 * @returns {Promise<{status: string, messageId: string}>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"IBSSR Portal" <${user}>`;

  if (!host || !user || !pass) {
    console.warn('[EMAIL MOCK] SMTP credentials missing in environment variables. Logging mail content:');
    console.log(`To: ${to}\nSubject: ${subject}\nText:\n${text}`);
    return { status: 'Mocked', messageId: `mock-${Date.now()}` };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      // Handle potential double quotes from string values
      pass: pass.replace(/^"|"$/g, '')
    }
  });

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] To: ${to} | MessageId: ${info.messageId}`);
    return { status: 'Sent', messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR] SMTP dispatch failed:', error);
    throw error;
  }
}
