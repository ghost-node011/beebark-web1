// Serves /in/:username (see vercel.json) with link-preview tags, so a profile
// shared on LinkedIn, WhatsApp or X shows the person's photo, name and
// headline. Browsers then load the normal app, which renders the page.
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  const username = String(req.query.u || '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60);
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const backend = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');

  let shell;
  try {
    shell = await (await fetch(`${origin}/index.html`)).text();
  } catch {
    res.writeHead(302, { Location: `/profile/${username}` });
    return res.end();
  }

  let tags = '';
  try {
    const r = await fetch(`${backend}/api/profile/open/${encodeURIComponent(username)}?preview=1`);
    if (r.ok) {
      const { user } = await r.json();
      const title = `${user.name}${user.headline ? ` – ${user.headline}` : ''} | BeeBark`;
      const description = (user.bio || [user.headline, user.location].filter(Boolean).join(' · ') || `${user.name} on BeeBark`).slice(0, 200);
      const image = user.profilePic || user.coverPhoto || `${origin}/image.png`;
      const url = `${origin}/in/${username}`;
      tags = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<link rel="canonical" href="${esc(url)}" />`,
        `<meta property="og:type" content="profile" />`,
        `<meta property="og:site_name" content="BeeBark" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:image" content="${esc(image)}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${esc(image)}" />`
      ].join('');
    }
  } catch {
    // No preview tags; the page itself still works
  }

  const html = tags ? shell.replace(/<title>[^<]*<\/title>/, '').replace('</head>', `${tags}</head>`) : shell;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.end(html);
};
