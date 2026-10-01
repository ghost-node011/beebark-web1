// Pre-launch waitlist welcome emails: one per audience, chosen from the role
// and career stage people pick on the /join-waitlist form.

const SITE_URL = 'https://www.thebeebark.com';
const LOGO_URL = `${SITE_URL}/bbark.png`;
const LAUNCH_DATE = '11 October 2026';

// Paste the real links into the backend env before these go live; the
// WhatsApp block is left out of the email while either is missing.
const whatsappLinks = () => ({
  community: (process.env.WHATSAPP_COMMUNITY_URL || '').trim(),
  channel: (process.env.WHATSAPP_CHANNEL_URL || '').trim()
});

// Same palette as the website (tailwind bb-*)
const C = {
  ink: '#1B1611',
  body: '#4A4038',
  muted: '#8A7F74',
  yellow: '#FFD21F',
  gold: '#F2B705',
  cream: '#F8F5F0',
  sand: '#F3EBDD',
  line: '#E6DED3',
  card: '#FFFFFF',
  whatsapp: '#1FA855'
};

const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TEMPLATES = {
  architects: {
    label: 'Architects and architecture firms',
    subject: (n) => `You're in, ${n}. BeeBark was built with architects in mind.`,
    preview: 'Your early-access spot is reserved.',
    intro: 'Welcome to BeeBark. You’re officially on the waitlist.',
    pitch:
      'Someone finally thought about how architects actually work: your projects, your design thinking and your collaborators, together in one place instead of scattered across many platforms. This is your platform, and you’re among the first inside.',
    peek: 'First looks at how you’ll showcase your projects'
  },
  interiors: {
    label: 'Interior designers and firms',
    subject: (n) => `Your spaces deserve their own stage, ${n}`,
    preview: 'Welcome to BeeBark. Your early-access spot is reserved.',
    intro: 'Welcome to BeeBark. You’re officially on the waitlist.',
    pitch:
      'We built this for designers like you: a place to show the spaces you’ve created so clients can find you, and to connect with the specialists who complement your work. It’s your platform, and you’re among the first to step in.',
    peek: 'Sneak peeks of how your portfolio will look'
  },
  realEstate: {
    label: 'Real estate professionals and businesses',
    subject: (n) => `Welcome to BeeBark, ${n}. This one is for you.`,
    preview: 'Your early-access spot is reserved.',
    intro: 'You’re officially on the BeeBark waitlist.',
    pitch:
      'Developers, brokers, agents and property teams rarely get a network built around their projects and expertise. BeeBark is that place: somewhere to present your work, reach the right clients and build relationships across the industry. It’s your platform, and you’re among the first in.',
    peek: 'First looks at how your projects and business will be presented'
  },
  construction: {
    label: 'Construction professionals and companies',
    subject: (n) => `The projects you've delivered finally have a home, ${n}`,
    preview: 'Welcome to BeeBark. Your early-access spot is reserved.',
    intro: 'Welcome to BeeBark. You’re officially on the waitlist.',
    pitch:
      'The projects you’ve delivered are your strongest proof. We built BeeBark so contractors, engineers, consultants and delivery teams have a place to show them and win new clients and partners. It’s your platform, and you’re among the first inside.',
    peek: 'Sneak peeks of how your delivered projects will be showcased'
  },
  students: {
    label: 'Students and recent graduates',
    subject: (n) => `Your career starts here, ${n}`,
    preview: 'Welcome to BeeBark. Your early-access spot is reserved.',
    intro: 'Welcome to BeeBark. You’re officially on the waitlist.',
    pitch:
      'You’ve put in the work, and now it deserves to be seen. BeeBark helps you present your academic projects, show your skills and discover internships and entry-level roles across architecture, interior design, construction and real estate. It’s your platform, and you’re among the first to begin.',
    peek: 'First looks at how to build your portfolio'
  },
  professionals: {
    label: 'Working professionals',
    subject: (n) => `A place for your next step, ${n}`,
    preview: 'Welcome to BeeBark. Your early-access spot is reserved.',
    intro: 'Welcome to BeeBark. You’re officially on the waitlist.',
    pitch:
      'BeeBark is where your profile brings you clients and opportunities, where you can explore your next role and stay connected with peers across the industry. Someone built this thinking of you, and you’re among the first inside.',
    peek: 'Sneak peeks of the platform before launch'
  }
};

const ROLE_TEMPLATE = {
  Architect: 'architects',
  Consultant: 'architects',
  'Interior Designer': 'interiors',
  Developer: 'realEstate',
  'Real Estate Professional': 'realEstate',
  'Builder / Contractor': 'construction',
  Engineer: 'construction',
  'Supplier / Manufacturer': 'construction',
  'Architecture Student': 'students'
};

// Students and freshers get the students email whatever their role
const pickTemplate = ({ role, careerStage } = {}) => {
  if (careerStage === 'Student' || careerStage === 'Fresher') return 'students';
  return ROLE_TEMPLATE[role] || 'professionals';
};

const tick = `<td width="28" valign="top" style="padding:2px 0 0 0;">
  <div style="width:20px;height:20px;line-height:20px;border-radius:999px;background:${C.yellow};color:${C.ink};font-size:12px;font-weight:800;text-align:center;">&#10003;</div>
</td>`;

const expectRow = (text) => `
  <tr>
    ${tick}
    <td style="padding:0 0 12px 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.body};">${text}</td>
  </tr>`;

const whatsappButton = (label, sub, href) => `
  <tr>
    <td style="padding:0 0 10px 0;">
      <a href="${escapeHtml(href)}" style="display:block;text-decoration:none;border:1px solid ${C.line};border-radius:14px;background:${C.card};padding:14px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="44" valign="middle">
              <div style="width:36px;height:36px;line-height:36px;border-radius:10px;background:${C.whatsapp};color:#FFFFFF;font-family:${FONT};font-size:17px;font-weight:800;text-align:center;">&#9742;</div>
            </td>
            <td valign="middle" style="font-family:${FONT};">
              <div style="font-size:15px;font-weight:700;color:${C.ink};">${label}</div>
              <div style="font-size:13px;color:${C.muted};padding-top:2px;">${sub}</div>
            </td>
            <td width="20" valign="middle" align="right" style="font-family:${FONT};font-size:18px;font-weight:700;color:${C.gold};">&rsaquo;</td>
          </tr>
        </table>
      </a>
    </td>
  </tr>`;

const renderWaitlistEmail = (key, name, { links = whatsappLinks() } = {}) => {
  const t = TEMPLATES[key] || TEMPLATES.professionals;
  const rawFirstName = (name || '').trim().split(/\s+/)[0] || 'there';
  const firstName = escapeHtml(rawFirstName);
  const showWhatsapp = links.community && links.channel;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light" />
    <title>Welcome to BeeBark</title>
  </head>
  <body style="margin:0;padding:0;background:${C.cream};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preview}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
      <tr>
        <td align="center" style="padding:28px 12px 36px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
            <!-- Logo -->
            <tr>
              <td style="padding:0 4px 18px 4px;font-family:${FONT};">
                <img src="${LOGO_URL}" alt="" width="26" height="34" style="display:inline-block;width:26px;height:34px;border:0;vertical-align:middle;" />
                <span style="vertical-align:middle;padding-left:8px;font-size:22px;font-weight:800;letter-spacing:-0.4px;color:${C.ink};">BeeBark</span>
              </td>
            </tr>

            <tr>
              <td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">
                <!-- Hero -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:${C.ink};border-radius:20px 20px 0 0;padding:34px 32px 30px 32px;font-family:${FONT};">
                      <div style="display:inline-block;background:${C.yellow};color:${C.ink};border-radius:999px;padding:5px 12px;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">You’re on the waitlist</div>
                      <h1 style="margin:16px 0 0 0;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.6px;color:#FFFFFF;">Welcome, ${firstName}.</h1>
                      <p style="margin:10px 0 0 0;font-size:15px;line-height:1.55;color:#D9CFC2;">${t.preview}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="height:5px;line-height:5px;font-size:0;background:${C.yellow};">&nbsp;</td>
                  </tr>
                </table>

                <!-- Body -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:30px 32px 6px 32px;font-family:${FONT};">
                      <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:${C.ink};">Hi ${firstName},</p>
                      <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:${C.ink};font-weight:600;">${t.intro}</p>
                      <p style="margin:0;font-size:16px;line-height:1.65;color:${C.body};">${t.pitch}</p>
                    </td>
                  </tr>

                  <!-- What to expect -->
                  <tr>
                    <td style="padding:26px 32px 0 32px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};border-radius:16px;">
                        <tr>
                          <td style="padding:22px 22px 10px 22px;">
                            <p style="margin:0 0 14px 0;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#A07A00;">What to expect until 11 October</p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              ${expectRow('Regular updates on email and WhatsApp')}
                              ${expectRow(t.peek)}
                              ${expectRow(`Your early-access invite on launch day, <strong style="color:${C.ink};">${LAUNCH_DATE}</strong>`)}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${
                    showWhatsapp
                      ? `<!-- WhatsApp -->
                  <tr>
                    <td style="padding:26px 32px 0 32px;">
                      <p style="margin:0 0 12px 0;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${C.muted};">Stay close</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        ${whatsappButton('Join our WhatsApp community', 'Talk with other early members', links.community)}
                        ${whatsappButton('Follow our WhatsApp channel', 'Launch news and sneak peeks first', links.channel)}
                      </table>
                    </td>
                  </tr>`
                      : ''
                  }

                  <!-- Sign-off -->
                  <tr>
                    <td style="padding:24px 32px 32px 32px;font-family:${FONT};">
                      <p style="margin:0;font-size:16px;line-height:1.6;color:${C.body};">See you on 11 October,</p>
                      <p style="margin:2px 0 0 0;font-size:16px;line-height:1.6;font-weight:800;color:${C.ink};">Team BeeBark</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:22px 16px 0 16px;font-family:${FONT};">
                <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:${C.muted};">Portfolios, hiring and networking for architecture, interior design, construction and real estate.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:${C.muted};">
                  You’re receiving this because you joined the waitlist on
                  <a href="${SITE_URL}" style="color:${C.body};text-decoration:underline;">thebeebark.com</a>.
                  Questions? Reply to this email.
                </p>
                <p style="margin:6px 0 0 0;font-size:12px;color:${C.muted};">&copy; ${new Date().getFullYear()} BeeBark. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: t.subject(rawFirstName), html };
};

module.exports = { TEMPLATES, pickTemplate, renderWaitlistEmail };
