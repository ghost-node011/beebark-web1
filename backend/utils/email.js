const nodemailer = require('nodemailer');
const axios = require('axios');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const EmailLog = require('../models/EmailLog');
const { pickTemplate, renderWaitlistEmail } = require('./waitlistEmails');

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

// Amazon SES is used first when SES_REGION is set (on EC2 the credentials come
// from the instance's IAM role). If SES rejects a message — e.g. while the
// account is still in the SES sandbox — it falls back to SMTP when configured.
const SES_REGION = (process.env.SES_REGION || '').trim();
const ses = SES_REGION ? new SESv2Client({ region: SES_REGION }) : null;
const smtpConfigured = () => !!(process.env.EMAIL_HOST && process.env.EMAIL_PASSWORD);

// SES configuration sets publish each email's events (delivered, opened,
// clicked, bounced...) to SNS → /api/email-events. Codes and password resets
// use a set without open/click tracking: tracking adds nothing there and click
// tracking would rewrite their links.
const TRACKED_SET = (process.env.SES_CONFIGURATION_SET || '').trim();
const UNTRACKED_SET = (process.env.SES_CONFIGURATION_SET_NO_TRACKING || '').trim();
const UNTRACKED_TYPES = new Set(['otp', 'password_reset', 'login_alert']);
// With SES set up, all mail goes through SES only. EMAIL_FALLBACK=1 lets a
// rejected message fall back to the relay / SMTP (only for emergencies).
const FALLBACK_ALLOWED = process.env.EMAIL_FALLBACK === '1';

// Record every send for the email dashboard. Never let logging break sending.
// SES rows are upserted by messageId, since an event can occasionally arrive first.
const logEmail = (fields) => {
  const write = fields.messageId
    ? EmailLog.updateOne(
      { messageId: fields.messageId },
      {
        $set: { to: fields.to, subject: fields.subject, type: fields.type, via: fields.via, tracked: !!fields.tracked },
        $setOnInsert: { sentAt: new Date() }
      },
      { upsert: true }
    )
    : EmailLog.create(fields);
  return write.catch((err) => console.error('Email log write failed:', err.message));
};

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
          <p style="max-width:560px;margin:16px auto 0;font-size:11px;color:#9AA0A6;text-align:center;">Clients, connections and careers across the built environment.</p>
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

const send = async ({ to, subject, html, type = 'other' }) => {
  const started = Date.now();
  const from = process.env.EMAIL_FROM || 'BeeBark <noreply@thebeebark.com>';
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;
  const log = { to, subject, type };

  // 1. Amazon SES, when configured
  if (ses) {
    const untracked = UNTRACKED_TYPES.has(type);
    const configurationSet = (untracked ? UNTRACKED_SET : TRACKED_SET) || undefined;
    try {
      const result = await ses.send(new SendEmailCommand({
        ConfigurationSetName: configurationSet,
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } }
          }
        }
      }));
      console.log(`📧 Mail sent to ${to} via SES in ${Date.now() - started}ms`);
      logEmail({ ...log, via: 'ses', messageId: result.MessageId, tracked: !!configurationSet && !untracked });
      return;
    } catch (err) {
      if (!FALLBACK_ALLOWED || (!MAIL_SERVICE_URL && !smtpConfigured())) {
        logEmail({ ...log, via: 'ses', status: 'failed', error: `${err.name}: ${err.message}` });
        throw new Error(`SES error: ${err.name}: ${err.message}`);
      }
      console.error(`SES send failed (${err.name}: ${err.message}); trying the fallback`);
    }
  }

  // 2. The mail relay (e.g. a Vercel function), for hosts that block outbound
  // SMTP such as Render's free tier
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
      logEmail({ ...log, via: 'relay' });
    } catch (err) {
      // Surface the relay's real reason (e.g. "535 Authentication Failed")
      const status = err.response?.status;
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.code ||
        err.message;
      const message = `mail relay error${status ? ` (HTTP ${status})` : ''}: ${detail}`;
      logEmail({ ...log, via: 'relay', status: 'failed', error: message });
      throw new Error(message);
    }
    return;
  }

  // 3. Direct SMTP. GoDaddy and most SMTP hosts reject a From that isn't the
  // signed-in mailbox, so keep the sender name but use EMAIL_USER's address
  const smtpUser = process.env.EMAIL_USER;
  const smtpFrom = smtpUser ? from.replace(/<[^>]*>|^[^<\s]+@[^\s>]+$/, (m) => (m.startsWith('<') ? `<${smtpUser}>` : smtpUser)) : from;
  try {
    await getTransporter().sendMail({ from: smtpFrom, to, subject, html, replyTo });
  } catch (err) {
    logEmail({ ...log, via: 'smtp', status: 'failed', error: err.message });
    throw err;
  }
  console.log(`📧 Mail sent to ${to} via SMTP in ${Date.now() - started}ms`);
  logEmail({ ...log, via: 'smtp' });
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
    type: 'otp',
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

// --- Welcome email (sent once, when someone finishes onboarding) ---
const sendWelcomeEmail = async (toEmail, name) => {
  const firstName = (name || '').split(' ')[0] || 'there';
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">
      Your profile is set up and your account is live. Welcome to <strong>BeeBark</strong>, a growing
      ecosystem designed to connect people, ideas, and possibilities in the built environment.
    </p>
    <p style="margin:0 0 4px 0;font-size:15px;color:${BRAND.black};font-weight:700;">A few ways to get started:</p>
    <ul style="margin:0 0 8px 0;padding-left:20px;font-size:15px;color:${BRAND.ink};line-height:1.8;">
      <li>Add your projects to your portfolio so the right people can find you</li>
      <li>Connect with professionals, firms, and students in your field</li>
      <li>Explore jobs and opportunities tailored to your skills</li>
    </ul>
    ${button('Go to your dashboard', `${APP_URL()}/dashboard`)}
  `;

  await send({
    type: 'welcome',
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

// --- New sign-in alert (a device this account hasn't used before) ---
// details: { device: "Chrome on macOS", ip, at: Date, method: "password" | "google" | ... }
const sendLoginAlertEmail = async (toEmail, name, { device, ip, at = new Date(), method = '' } = {}) => {
  const firstName = (name || '').split(' ')[0] || 'there';
  const esc = (v) => String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const when = new Date(at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const how = { password: 'Email and password', google: 'Google', linkedin: 'LinkedIn', phone: 'Phone number' }[method] || '';
  const row = (label, value) => (value ? `<tr><td style="padding:6px 16px 6px 0;color:${BRAND.muted};font-size:14px;">${label}</td><td style="padding:6px 0;font-size:14px;color:${BRAND.ink};font-weight:600;">${esc(value)}</td></tr>` : '');
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Hi ${esc(firstName)},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">Your BeeBark account was just signed in on a new device.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      ${row('Device', device)}${row('When', `${when} IST`)}${row('Signed in with', how)}${row('IP address', ip)}
    </table>
    <p style="margin:0 0 8px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;">If this was you, there's nothing to do.</p>
    <p style="margin:0 0 8px 0;font-size:15px;color:${BRAND.ink};line-height:1.6;"><strong>Not you?</strong> Reset your password now and sign out of all devices from Settings.</p>
    ${button('Reset my password', `${APP_URL()}/forgot-password`)}`;
  await send({
    type: 'login_alert',
    to: toEmail,
    subject: `New sign-in to your BeeBark account${device ? ` (${device})` : ''}`,
    html: layout({
      preheader: `Signed in on ${device || 'a new device'} at ${when} IST`,
      heading: 'New sign-in',
      body,
      footerNote: "We send this whenever your account is used on a device we haven't seen before."
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
    type: 'password_reset',
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
    type: 'password_reset',
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
// Picks one of six audience-specific welcome emails (utils/waitlistEmails.js)
const sendWaitlistEmail = async (toEmail, name, profile = {}) => {
  const { subject, html } = renderWaitlistEmail(pickTemplate(profile), name);
  await send({ to: toEmail, subject, html, type: 'waitlist' });
};

// --- Job applications waiting for the student's answers ---
// jobs: [{ title, company }] — every application currently waiting on them
const sendNeedsAnswersEmail = async (toEmail, name, jobs) => {
  const firstName = (name || '').split(' ')[0] || 'there';
  const esc = (v) => String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = jobs.slice(0, 8).map((j) => `<li style="margin:0 0 6px 0;"><strong>${esc(j.title)}</strong>${j.company ? ` at ${esc(j.company)}` : ''}</li>`).join('');
  const more = jobs.length > 8 ? `<p style="margin:0 0 16px 0;color:${BRAND.muted};font-size:14px;">and ${jobs.length - 8} more.</p>` : '';
  const url = `${APP_URL()}/jobs?tab=pending`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">Hi ${esc(firstName)}, BeeBark's AI found ${jobs.length === 1 ? 'a job that matches' : 'jobs that match'} your profile and filled in what it could. ${jobs.length === 1 ? 'It asks' : 'They ask'} something only you can answer, so ${jobs.length === 1 ? 'this application is' : 'these applications are'} waiting for you:</p>
    <ul style="margin:0 0 16px 18px;padding:0;font-size:15px;line-height:1.5;color:${BRAND.ink};">${list}</ul>
    ${more}
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">Answer once and we'll send the application. We'll remember your answer for similar questions.</p>
    <p style="margin:0 0 8px 0;"><a href="${url}" style="display:inline-block;background:${BRAND.black};color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;font-size:15px;">Answer and apply</a></p>`;
  await send({
    type: 'needs_answers',
    to: toEmail,
    subject: jobs.length === 1 ? `Quick question before we apply to ${jobs[0].title}` : `${jobs.length} applications are waiting for your answers`,
    html: layout({
      preheader: 'Your answer is needed to finish an application',
      heading: jobs.length === 1 ? 'One question before we apply' : 'A few questions before we apply',
      body,
      footerNote: "You're getting this because auto-apply is on in your BeeBark Jobs settings. Turn it off there any time."
    })
  });
};

// --- Quote request from someone browsing a product catalogue ---
const sendQuoteRequestEmail = async (toEmail, ownerName, { buyer, product, quantity, message, replyTo }) => {
  const esc = (v) => String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const firstName = (ownerName || '').split(' ')[0] || 'there';
  const row = (label, value) => (value ? `<tr><td style="padding:4px 16px 4px 0;color:${BRAND.muted};font-size:14px;">${label}</td><td style="padding:4px 0;font-size:14px;color:${BRAND.ink};">${esc(value)}</td></tr>` : '');
  const profileUrl = buyer.username ? `${APP_URL()}/profile/${encodeURIComponent(buyer.username)}` : APP_URL();
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">Hi ${esc(firstName)}, ${esc(buyer.name)} saw your catalogue on BeeBark and would like a quote.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      ${row('Product', product)}${row('Quantity', quantity)}${row('From', buyer.name)}${row('Email', replyTo)}
    </table>
    ${message ? `<p style="margin:0 0 16px 0;padding:12px 14px;background:#f6f5f2;border-radius:10px;font-size:15px;line-height:1.6;color:${BRAND.ink};white-space:pre-line;">${esc(message)}</p>` : ''}
    ${button('See their profile', profileUrl)}`;
  await send({
    type: 'quote_request',
    to: toEmail,
    subject: `Quote request${product ? ` for ${product}` : ''} from ${buyer.name}`,
    html: layout({ preheader: `${buyer.name} would like a quote`, heading: 'New quote request', body, footerNote: 'Reply to this email or connect with them on BeeBark to chat.' })
  });
};

module.exports = { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetOtpEmail, sendWaitlistEmail, sendNeedsAnswersEmail, sendQuoteRequestEmail, sendLoginAlertEmail, send };
