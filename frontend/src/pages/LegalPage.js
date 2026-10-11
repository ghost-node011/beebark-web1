import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiMapPin } from 'react-icons/fi';
import { BrandMark } from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import { LEGAL_DOCS, LEGAL_CONTACT, LEGAL_MENTIONS, legalDoc } from '../config/legal';

// "BEEBARK PRIVACY POLICY" -> "Privacy Policy"
const niceTitle = (t) => t.replace(/^BEEBARK\s+/, '').toLowerCase()
  .replace(/(^|[\s(&/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\bAi\b/g, 'AI').replace(/\b(And|Of|To)\b/g, (w) => w.toLowerCase());

// Text with the names of other BeeBark policies linked
const Linked = ({ text, self }) => {
  const parts = [];
  let rest = text;
  for (let guard = 0; rest && guard < 20; guard += 1) {
    let best = null;
    for (const [re, slug] of LEGAL_MENTIONS) {
      if (slug === self) continue;
      const m = rest.match(re);
      if (m && (!best || m.index < best.m.index)) best = { m, slug };
    }
    if (!best) break;
    parts.push(rest.slice(0, best.m.index));
    parts.push(<Link key={parts.length} to={legalDoc(best.slug).path} className="font-medium text-[#32281F] underline decoration-[#E0B93C] underline-offset-2 hover:decoration-[#32281F]">{best.m[0]}</Link>);
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  parts.push(rest);
  return <>{parts}</>;
};

const Contact = () => (
  <div className="my-3 rounded-2xl border border-[#EFEBE6] bg-[#FAF8F5] p-4 text-sm text-[#2A221C]" data-testid="legal-contact">
    <p className="font-semibold">{LEGAL_CONTACT.entity}</p>
    <p className="mt-2 flex items-start gap-2"><FiMapPin className="mt-0.5 shrink-0 text-[#857B71]" />{LEGAL_CONTACT.address}</p>
    <p className="mt-2 flex items-center gap-2"><FiMail className="shrink-0 text-[#857B71]" />Grievances, privacy and data requests:{' '}
      <a href={`mailto:${LEGAL_CONTACT.grievance}`} className="font-medium underline">{LEGAL_CONTACT.grievance}</a></p>
    <p className="mt-1 flex items-center gap-2"><FiMail className="shrink-0 text-[#857B71]" />General:{' '}
      <a href={`mailto:${LEGAL_CONTACT.general}`} className="font-medium underline">{LEGAL_CONTACT.general}</a></p>
  </div>
);

const Block = ({ b, self }) => {
  if (b.type === 'list') {
    return (
      <ol className="my-2 space-y-1 pl-1">
        {b.items.map((it, i) => (
          <li key={i} className="flex gap-2"><span className="w-7 shrink-0 text-[#857B71]">({String.fromCharCode(97 + (i % 26))})</span><span><Linked text={it} self={self} /></span></li>
        ))}
      </ol>
    );
  }
  if (b.type === 'h3') return <h3 className="mt-5 font-semibold text-[#1C1712]">{b.text}</h3>;
  if (b.type === 'contact') return <Contact />;
  return (
    <p className="my-2">{b.num && <span className="mr-2 font-semibold text-[#1C1712]">{b.num}</span>}<Linked text={b.text} self={self} /></p>
  );
};

/** One BeeBark policy, with tabs to the others and a contents list. */
const LegalPage = ({ doc: slug = 'privacy' }) => {
  const { user } = useAuth();
  const meta = legalDoc(slug) || LEGAL_DOCS[0];
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    meta.load().then((m) => { if (alive) setData(m.default || m); });
    return () => { alive = false; };
  }, [meta]);

  useEffect(() => {
    if (!data) { window.scrollTo(0, 0); return; }
    document.title = `${meta.label} · BeeBark`;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [data, meta]);

  const sections = data?.blocks.filter((b) => b.type === 'section') || [];
  const intro = data?.blocks.filter((b) => b.type !== 'section') || [];
  const updated = data?.meta?.updated || meta.updated;

  return (
    <div className="min-h-screen bg-white text-[#2A221C]">
      <header className="sticky top-0 z-10 border-b border-[#EFEBE6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark />
          {user
            ? <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#32281F] hover:underline"><FiArrowLeft />Back to BeeBark</Link>
            : <Link to="/login" className="text-sm font-semibold text-[#32281F] hover:underline">Sign in</Link>}
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Policies">
          {LEGAL_DOCS.map((d) => (
            <NavLink key={d.slug} to={d.path} data-testid={`legal-tab-${d.slug}`}
              className={() => `shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${d.slug === meta.slug ? 'border-[#F2B21B] text-[#1C1712]' : 'border-transparent text-[#857B71] hover:text-[#32281F]'}`}>
              {d.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10" data-testid={`legal-${meta.slug}`}>
        {!data ? <p className="text-sm text-[#857B71] lg:col-start-2">Loading…</p> : (
          <>
            <aside className="hidden lg:block">
              <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#857B71]">Contents</p>
                {sections.map((s) => (
                  <a key={s.num} href={`#s-${s.num}`} className="block py-1 text-[#6B625A] hover:text-[#1C1712]">{s.num}. {s.title}</a>
                ))}
              </div>
            </aside>
            {/* Manrope's ligatures would turn "(c)" into © */}
            <article className="min-w-0 text-[15px] leading-relaxed text-[#3D342C]" style={{ fontVariantLigatures: 'none', fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
              <h1 className="pf-serif text-3xl font-bold text-[#1C1712] sm:text-4xl">{niceTitle(data.title)}</h1>
              <p className="mt-2 text-sm text-[#857B71]">
                {data.meta?.effective && <>Effective {data.meta.effective} · </>}
                {updated && <>Last updated {updated}</>}
              </p>
              {intro.map((b, i) => <Block key={i} b={b} self={meta.slug} />)}

              <details className="mt-6 rounded-xl border border-[#EFEBE6] p-4 lg:hidden">
                <summary className="cursor-pointer text-sm font-semibold text-[#1C1712]">Contents</summary>
                <div className="mt-2 text-sm">
                  {sections.map((s) => <a key={s.num} href={`#s-${s.num}`} className="block py-1 text-[#6B625A]">{s.num}. {s.title}</a>)}
                </div>
              </details>

              {sections.map((s) => (
                <section key={s.num} id={`s-${s.num}`} className="mt-8 scroll-mt-32">
                  <h2 className="text-lg font-bold text-[#1C1712] sm:text-xl">{s.num}. {s.title}</h2>
                  {s.body.map((b, i) => <Block key={i} b={b} self={meta.slug} />)}
                </section>
              ))}

              <div className="mt-12 border-t border-[#EFEBE6] pt-6 text-sm text-[#857B71]">
                Questions about this policy? Write to{' '}
                <a href={`mailto:${LEGAL_CONTACT.grievance}`} className="font-medium text-[#32281F] underline">{LEGAL_CONTACT.grievance}</a>.
              </div>
            </article>
          </>
        )}
      </main>
    </div>
  );
};

export default LegalPage;
