const nodemailer = require('nodemailer');
const axios = require('axios');

// Brand palette
const BRAND = {
  yellow: '#FFC107',
  yellowSoft: '#FFE082',
  black: '#1A1A1A',
  ink: '#2D2D2D',
  muted: '#6B7280',
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#ECECEC'
};

const APP_URL = () => process.env.APP_URL || 'http://localhost:3000';

// Hosted on the public website so email clients can load it
const LOGO_URL = 'https://www.thebeebark.com/bbark.png';

// Mail is sent directly over SMTP (EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD).
// Set MAIL_SERVICE_URL (and MAIL_SHARED_SECRET) only to route mail through the
// Vercel relay instead, e.g. when the host blocks outbound SMTP.
const MAIL_SERVICE_URL = (process.env.MAIL_SERVICE_URL || '').trim();

let cachedTransporter = null;
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  const port = Number(process.env.EMAIL_PORT) || 587;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // SSL for 465, STARTTLS otherwise
    auth: {
      // Fall back to EMAIL_FROM if EMAIL_USER isn't set (common with GoDaddy)
      user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD
    },
    // Fail fast instead of hanging ~19s when the SMTP host is unreachable
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
  return cachedTransporter;
};

// Shared, email-client-safe shell (inline styles, table-based, mobile friendly)
const layout = ({
  preheader = '',
  heading,
  body,
  footerNote,
  reason = `You're receiving this email because an account was created on
                    <a href="${APP_URL()}" style="color:${BRAND.ink};text-decoration:underline;">BeeBark</a>.`
}) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${heading || 'BeeBark'}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);border:1px solid ${BRAND.border};">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg, ${BRAND.yellow} 0%, ${BRAND.yellowSoft} 100%);padding:28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:24px;font-weight:800;color:${BRAND.black};letter-spacing:-0.5px;">
                      <img src="${LOGO_URL}" alt="BeeBark" width="30" height="40" style="display:inline-block;width:30px;height:40px;border:0;margin-right:10px;vertical-align:middle;" />
                      <span style="vertical-align:middle;">BeeBark</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:${BRAND.black};font-weight:700;">${heading}</h1>
                ${body}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <div style="border-top:1px solid ${BRAND.border};padding-top:20px;">
                  ${footerNote ? `<p style="margin:0 0 12px 0;font-size:13px;color:${BRAND.muted};line-height:1.6;">${footerNote}</p>` : ''}
                  <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
                    ${reason}
                  </p>
                  <p style="margin:8px 0 0 0;font-size:12px;color:${BRAND.muted};">&copy; ${new Date().getFullYear()} BeeBark. All rights reserved.</p>
                </div>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:16px auto 0;font-size:11px;color:#9AA0A6;text-align:center;">The professional network for architects, designers and builders.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const button = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:999px;background:${BRAND.yellow};">
        <a href="${href}" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:${BRAND.black};text-decoration:none;border-radius:999px;">${label}</a>
      </td>
    </tr>
  </table>`;

const send = async ({ to, subject, html }) => {
  const started = Date.now();
  // If a mail relay is configured (e.g. a Vercel function whose network allows
  // outbound SMTP), send through it over HTTPS — useful when the backend host
  // blocks SMTP (Render free tier). Otherwise send via SMTP directly.
  if (MAIL_SERVICE_URL) {
    const base = MAIL_SERVICE_URL.replace(/\/+$/, '');
    try {
      await axios.post(
        `${base}/api/send`,
        { to, subject, html },
        {
          headers: { 'x-mail-secret': process.env.MAIL_SHARED_SECRET || '' },
          timeout: 15000
        }
      );
      console.log(`📧 Mail sent to ${to} via relay in ${Date.now() - started}ms`);
    } catch (err) {
      // Surface the relay's real reason (e.g. "535 Authentication Failed")
      const status = err.response?.status;
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.code ||
        err.message;
      throw new Error(`mail relay error${status ? ` (HTTP ${status})` : ''}: ${detail}`);
    }
    return;
  }

  const from = process.env.EMAIL_FROM || 'BeeBark <noreply@thebeebark.com>';
  await getTransporter().sendMail({ from, to, subject, html });
  console.log(`📧 Mail sent to ${to} via SMTP in ${Date.now() - started}ms`);
};

// --- OTP verification email ---
const sendOtpEmail = async (toEmail, name, otp) => {
  const firstName = (name || '').split(' ')[0] || 'there';
  const digits = String(otp)
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;min-width:44px;margin:0 4px;padding:14px 0;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:10px;font-size:26px;font-weight:800;color:${BRAND.black};text-align:center;">${d}</span>`
    )
    .join('');

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 8px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Use the verification code below to confirm your email and finish setting up your account.</p>
    <div style="text-align:center;margin:24px 0;white-space:nowrap;">${digits}</div>
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.muted};line-height:1.6;">This code expires in <strong>10 minutes</strong>. For your security, never share it with anyone.</p>
  `;

  await send({
    to: toEmail,
    subject: `${otp} is your BeeBark verification code`,
    html: layout({
      preheader: `Your BeeBark verification code is ${otp}`,
      heading: 'Verify your email',
      body,
      footerNote: "If you didn't request this code, you can safely ignore this email."
    })
  });
};

// --- Welcome email (after successful verification) ---
const sendWelcomeEmail = async (toEmail, name) => {
  const firstName = (name || '').split(' ')[0] || 'there';
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">
      Your email is verified and your account is live. Welcome to <strong>BeeBark</strong> — a growing
      ecosystem designed to connect people, ideas, and possibilities in the built environment.
    </p>
    <p style="margin:0 0 4px 0;font-size:15px;color:${BRAND.black};font-weight:700;">A few ways to get started:</p>
    <ul style="margin:0 0 8px 0;padding-left:20px;font-size:15px;color:${BRAND.ink};line-height:1.8;">
      <li>Complete your profile so the right people can find you</li>
      <li>Connect with professionals, firms, and students in your field</li>
      <li>Explore jobs and opportunities tailored to your skills</li>
    </ul>
    ${button('Go to your dashboard', `${APP_URL()}/dashboard`)}
  `;

  await send({
    to: toEmail,
    subject: 'Welcome to BeeBark',
    html: layout({
      preheader: "You're in! Here's how to get started on BeeBark.",
      heading: 'Welcome aboard!',
      body,
      footerNote: 'Need help? Just reply to this email and our team will get back to you.'
    })
  });
};

// --- Password reset email ---
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">We received a request to reset your BeeBark password. Click the button below to choose a new one.</p>
    ${button('Reset my password', resetUrl)}
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.muted};line-height:1.6;">This link expires in <strong>1 hour</strong>. If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="margin:0;font-size:13px;color:${BRAND.ink};word-break:break-all;">${resetUrl}</p>
  `;

  await send({
    to: toEmail,
    subject: 'Reset your BeeBark password',
    html: layout({
      preheader: 'Reset your BeeBark password',
      heading: 'Password reset request',
      body,
      footerNote: "If you didn't request a password reset, you can safely ignore this email — your password won't change."
    })
  });
};

// --- Password reset via OTP code ---
const sendPasswordResetOtpEmail = async (toEmail, name, otp) => {
  const firstName = (name || '').split(' ')[0] || 'there';
  const digits = String(otp)
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;min-width:44px;margin:0 4px;padding:14px 0;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:10px;font-size:26px;font-weight:800;color:${BRAND.black};text-align:center;">${d}</span>`
    )
    .join('');

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 8px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Use the code below to reset your BeeBark password.</p>
    <div style="text-align:center;margin:24px 0;white-space:nowrap;">${digits}</div>
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.muted};line-height:1.6;">This code expires in <strong>10 minutes</strong>. For your security, never share it with anyone.</p>
  `;

  await send({
    to: toEmail,
    subject: `${otp} is your BeeBark password reset code`,
    html: layout({
      preheader: `Your BeeBark password reset code is ${otp}`,
      heading: 'Reset your password',
      body,
      footerNote: "If you didn't request this, you can safely ignore this email — your password won't change."
    })
  });
};

// --- Pre-launch waitlist confirmation ---
const WAITLIST_SITE_URL = 'https://www.thebeebark.com';

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const sendWaitlistEmail = async (toEmail, name, { position } = {}) => {
  const firstName = escapeHtml((name || '').trim().split(/\s+/)[0] || 'there');
  const p = (text) => `<p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">${text}</p>`;
  const body = `
    ${p(`Hi ${firstName},`)}
    ${p(`Thanks for joining the <strong>BeeBark</strong> waitlist. You're officially on the list!`)}
    ${position ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
      <tr>
        <td style="background:#FFF8E1;border:1px solid ${BRAND.yellowSoft};border-radius:14px;padding:16px 26px;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.muted};font-weight:700;">Your spot</div>
          <div style="font-size:30px;font-weight:800;color:${BRAND.black};margin-top:2px;">#${Number(position).toLocaleString('en-IN')}</div>
        </td>
      </tr>
    </table>` : ''}
    ${p(`BeeBark is a professional network for architects, designers and builders, a place where architects, interior designers, builders, developers, students and real estate professionals can:`)}
    <ul style="margin:0 0 16px 0;padding-left:20px;font-size:15px;color:${BRAND.ink};line-height:1.8;">
      <li><strong>Showcase their work</strong> with a portfolio built for spaces and projects</li>
      <li><strong>Find jobs and opportunities</strong> matched to their skills</li>
      <li><strong>Connect and chat</strong> with professionals across the industry</li>
    </ul>
    <p style="margin:0 0 4px 0;font-size:15px;color:${BRAND.black};font-weight:700;">What happens next?</p>
    <ul style="margin:0 0 8px 0;padding-left:20px;font-size:15px;color:${BRAND.ink};line-height:1.8;">
      <li>When BeeBark launches, waitlist members get access first</li>
      <li>Your invite will arrive at this email address, so keep an eye on your inbox</li>
      <li>Until then, we'll only send you important launch updates, never spam</li>
    </ul>
    ${button('Discover BeeBark', WAITLIST_SITE_URL)}
    ${p(`Know someone who should be here? Forward this email and invite them to join BeeBark.`)}
  `;

  await send({
    to: toEmail,
    subject: "You're on the BeeBark waitlist",
    html: layout({
      preheader: "You're in! We'll invite you as soon as early access opens.",
      heading: "You're on the list!",
      body,
      footerNote: 'Questions? Just reply to this email or write to info@thebeebark.com.',
      reason: `You're receiving this email because you joined the waitlist on
                    <a href="${WAITLIST_SITE_URL}" style="color:${BRAND.ink};text-decoration:underline;">thebeebark.com</a>.`
    })
  });
};

module.exports = { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetOtpEmail, sendWaitlistEmail };
