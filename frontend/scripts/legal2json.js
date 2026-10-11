// Turns a BeeBark policy .docx into the JSON that pages/LegalPage.js shows.
// macOS:  textutil -convert txt -output /tmp/p.txt "docs/Privacy policy.docx"
//         node frontend/scripts/legal2json.js /tmp/p.txt frontend/src/content/legal/privacy.json
// Contact lines are replaced by one standard contact card (config/legal.js LEGAL_CONTACT).
const fs = require('fs');
const [,, src, out] = process.argv;
const ADDRESS = '249, First Floor, Kandle Kashan Fatehpuri, Chandni Chowk, Chandni Chowk Police Station, Delhi, North Delhi – 110006, India';
let lines = fs.readFileSync(src, 'utf8').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, ''));
const title = lines.shift().trim();
const meta = {};
const blocks = [];
let cur = null; // current section
const push = (b) => (cur ? cur.body : blocks).push(b);
for (let raw of lines) {
  let l = raw.trim().replace(/^©\s*/, '(c) '); // Word turns "(c)" into ©
  if (!l) continue;
  // dates
  const d = l.match(/^Effective Date:\s*(.*?)(?:\s{2,}|\t+)Last Updated:\s*(.*)$/);
  if (d) { meta.effective = d[1].trim(); meta.updated = d[2].trim(); continue; }
  const e = l.match(/^(Effective Date|Last Updated):\s*(.*)$/);
  if (e) { meta[e[1] === 'Effective Date' ? 'effective' : 'updated'] = e[2].replace(/\[●\]/, '').trim(); continue; }
  if (/^END OF /.test(l)) continue;
  if (/^Before publication, BeeBark must complete/.test(l)) continue; // drafting note
  // placeholders
  l = l.replace(/\[LEGAL NAME OF BEEBARK ENTITY\], having its registered office at \[●\]/, `Beebark Tech LLP, having its registered office at ${ADDRESS}`)
       .replace(/\[LEGAL NAME OF BEEBARK ENTITY\]/, 'Beebark Tech LLP')
       .replace(/\[NEW DELHI, INDIA \/ ●\]/, 'New Delhi, India')
       .replace('Fist Floor, Kandle Kasan', 'First Floor, Kandle Kashan')
       .replace('First Floor, kashan Fatehpuri', 'First Floor, Kandle Kashan Fatehpuri')
       .replace('upto 90 days to delete content after 90 days to delete content after', 'up to 90 days to delete content after')
       .replace(/\bupto\b/g, 'up to');
  // section heading: "12. TITLE - lead text" or "12. Title"
  const h = l.match(/^(\d{1,2})\.\s+(.+)$/);
  if (h && !/^\d+\.\d/.test(l)) {
    let [, num, rest] = h;
    let lead = '';
    const dash = rest.match(/^([A-Z’'&\/,()\- ]{3,}?)\s+-\s+(.*)$/);
    if (dash) { rest = dash[1]; lead = dash[2]; }
    const t = rest === rest.toUpperCase() ? rest.toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bAi\b/g, 'AI').replace(/\bAnd\b/g, 'and').replace(/\bOf\b/g, 'of').replace(/\bTo\b/g, 'to').replace(/\bAs\b/g, 'as').replace(/\bThe\b/g, 'the').replace(/\bWith\b/g, 'with').replace(/\bIn\b/g, 'in').replace(/\bFor\b/g, 'for').replace(/\bOn\b/g, 'on').replace(/\bBy\b/g, 'by').replace(/\b(Or|A|An|At|From|Is)\b/g, (w) => w.toLowerCase()).replace(/^(\w)/, (c) => c.toUpperCase()).replace(/\bBeebark\b/g, 'BeeBark').replace(/\bSgi\b/, 'SGI') : rest;
    cur = { type: 'section', num, title: t, body: [] };
    blocks.push(cur);
    if (lead) push({ type: 'p', text: lead });
    continue;
  }
  // list item (a) / (i)
  const li = l.match(/^\(([a-z]{1,4})\)\s+(.*)$/);
  if (li) {
    const body = cur ? cur.body : blocks;
    const last = body[body.length - 1];
    if (last && last.type === 'list') last.items.push(li[2]); else push({ type: 'list', items: [li[2]] });
    continue;
  }
  // numbered clause 1.2
  const cl = l.match(/^(\d+\.\d+)\s+(.*)$/);
  if (cl) { push({ type: 'p', num: cl[1], text: cl[2] }); continue; }
  // contact-ish "Label: value" lines (drop empty / placeholder ones)
  // contact lines ("Email:", "Grievance Officer: [NAME]", "Beebark Tech LLP"...): the page shows
  // one standard contact card in this section instead
  const kv = l.match(/^([A-Za-z\/ ]{2,40}):\s*(.*)$/);
  if ((kv && /Email|Address|Website|Name|Officer|Contact|Registered Office/.test(kv[1])) || /^Beebark Tech( LLP)?$/i.test(l) || /\[●\]|\[NAME\]|\[EMAIL\]/.test(l)) {
    const body = cur ? cur.body : blocks;
    if (cur && body[body.length - 1]?.type !== 'contact') body.push({ type: 'contact' });
    continue;
  }
  // short line without end punctuation followed by a list/sentences: sub-heading
  if (l.length < 70 && !/[.;:,]$/.test(l) && /^[A-Z]/.test(l) && cur) { push({ type: 'h3', text: l }); continue; }
  push({ type: 'p', text: l });
}
fs.writeFileSync(out, JSON.stringify({ title, meta, blocks }, null, 1));
const n = blocks.filter((b) => b.type === 'section').length;
console.log(out.split('/').pop(), 'sections', n, 'meta', JSON.stringify(meta));
