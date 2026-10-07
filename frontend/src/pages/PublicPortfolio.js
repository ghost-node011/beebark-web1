import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { resolveTemplate, ProjectViewer, PROJECT_VIEWER_DIALOG_CLASS, PALETTE_DEFAULTS } from '../components/portfolio/PortfolioTemplates';
import PortfolioNav from '../components/portfolio/editor/PortfolioNav';
import QuoteDialog from '../components/portfolio/editor/QuoteDialog';
import ShareMenu from '../components/ShareMenu';
import ReportDialog from '../components/ReportDialog';
import { exportPortfolioPdf } from '../utils/exportPortfolioPdf';
import BeeLoader from '../components/BeeLoader';
import { FiArrowLeft, FiDownload, FiShare2, FiFlag, FiBookmark, FiMail, FiPhone, FiGlobe, FiMapPin, FiMessageCircle } from 'react-icons/fi';

const PublicPortfolio = () => {
  const { username } = useParams();
  const { user: viewer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  // { item } while the quote form is open (item is null for a general message)
  const [quoteFor, setQuoteFor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const captureRef = useRef(null);
  const contactRef = useRef(null);
  const missingWarned = useRef(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/portfolio/${username}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [username]);

  // The open project lives in the URL (?project=<id>) so it can be shared
  const projectId = searchParams.get('project');
  const items = data?.items || [];
  // Bookmark a project (counts towards the owner's "Project saves")
  const toggleSave = async (item) => {
    const saved = !item.isSaved;
    const patch = (value) => setData((d) => ({ ...d, items: d.items.map((i) => (i._id === item._id ? { ...i, isSaved: value } : i)) }));
    patch(saved);
    try {
      await axios.post(`${API_URL}/api/portfolio/items/${item._id}/save`, { saved });
    } catch {
      patch(!saved);
    }
  };
  const viewingIndex = projectId ? items.findIndex((i) => i._id === projectId) : -1;
  const viewingItem = viewingIndex >= 0 ? items[viewingIndex] : null;

  const setProject = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('project', id);
    else next.delete('project');
    setSearchParams(next, { replace: true });
  };
  const openProject = (item, photo = 0) => {
    setViewerPhoto(photo);
    setProject(item._id);
  };
  const showAt = (index) => {
    if (items[index]) { setViewerPhoto(0); setProject(items[index]._id); }
  };

  useEffect(() => {
    if (data && projectId && !viewingItem && !missingWarned.current) {
      missingWarned.current = true;
      toast.error('That project is no longer in this portfolio');
    }
  }, [data, projectId, viewingItem]);

  // Arriving from the CV page's "Contact" link
  useEffect(() => {
    if (data && location.hash === '#contact') contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data, location.hash]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPortfolioPdf(captureRef.current, `${username}.pdf`);
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Portfolio not found.</p>
          <Link to="/dashboard" className="text-black font-semibold hover:underline">Back to BeeBark</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <BeeLoader size="full" label="Opening the portfolio" />;
  }

  const Template = resolveTemplate(data.theme);
  const owner = data.user || {};
  const viewerId = viewer?._id || viewer?.id;
  const isOwner = !!viewer && ((owner._id && viewerId && String(owner._id) === String(viewerId)) || (owner.username && viewer.username === owner.username));
  const canReport = !!viewer && !isOwner && !!owner._id;
  const pillBtn = 'inline-flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-black hover:bg-gray-50';
  const mode = data.mode === 'catalogue' ? 'catalogue' : 'portfolio';
  const showCv = data.showCv !== false;
  const showContact = data.showContact !== false;

  // "Get a quote" / "Message": signed-in visitors go to a chat with a drafted message;
  // everyone else signs up first and comes back here
  const enquire = (item) => {
    if (!viewer) {
      navigate(`/register?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (isOwner) {
      toast.message('This is your own portfolio');
      return;
    }
    if (!owner._id) return;
    if (item) axios.post(`${API_URL}/api/profile/${owner._id}/event`, { type: 'enquiry', item: item._id }, { silent: true }).catch(() => {});
    // Chat is only between connections; anyone else sends a quote request
    const connected = (viewer.connections || []).some((c) => String(c?._id || c) === String(owner._id));
    if (!connected) {
      setQuoteFor({ item: item || null });
      return;
    }
    let draft = `Hi${owner.name ? ` ${owner.name.split(' ')[0]}` : ''}, I came across your portfolio on BeeBark and would like to get in touch.`;
    if (item) {
      draft = `Hi, I'd like a quote for ${item.title}${item.sku ? ` (SKU ${item.sku})` : ''}`;
    }
    navigate(`/chat?with=${owner._id}&draft=${encodeURIComponent(draft)}`);
  };

  const palette = PALETTE_DEFAULTS[data.theme] || PALETTE_DEFAULTS.editorial || {};
  const contactBg = data.look?.background || palette.background || '#FBF8F3';
  const contactFg = data.look?.textColor || palette.textColor || '#1C1A17';
  const c = owner.contact || {};
  const biz = owner.business || {};
  const website = c.website || biz.website;
  const contactRows = [
    c.email && { icon: FiMail, label: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: FiPhone, label: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}` },
    c.whatsapp && { icon: FiMessageCircle, label: `WhatsApp ${c.whatsapp}`, href: `https://wa.me/${c.whatsapp.replace(/\D/g, '')}` },
    website && { icon: FiGlobe, label: website.replace(/^https?:\/\//, ''), href: /^https?:\/\//.test(website) ? website : `https://${website}` },
    (c.address || biz.address || owner.location) && { icon: FiMapPin, label: c.address || biz.address || owner.location }
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between p-4 sm:p-6" data-pdf-ignore>
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black">
          <FiArrowLeft />Back to BeeBark
        </Link>
        {data.items.length > 0 && (
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="flex items-center gap-2">
            <FiDownload />{exporting ? 'Exporting...' : 'Export as PDF'}
          </Button>
        )}
      </div>
      <PortfolioNav
        username={owner.username || username}
        name={owner.name}
        active="portfolio"
        showCv={showCv}
        showContact={showContact}
        onContact={() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
      <div ref={captureRef}>
        {data.items.length === 0 ? (
          <p className="text-gray-500 px-4 py-6 sm:px-6">This portfolio is empty for now.</p>
        ) : (
          <Template items={data.items} user={data.user} headline={data.headline} editable={false} onOpen={openProject} font={data.font} accentColor={data.accentColor} look={data.look} mode={mode} onEnquire={enquire} />
        )}

        {showContact && (
          <section id="contact" ref={contactRef} className="scroll-mt-14 px-4 py-14 sm:px-6 sm:py-20" style={{ backgroundColor: contactBg, color: contactFg }} data-testid="pf-contact">
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">Contact</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{mode === 'catalogue' ? 'Ask for a quote' : 'Get in touch'}</h2>
              {biz.name && <p className="mt-2 text-base opacity-80">{biz.name}</p>}
              {data.look?.contactInfo && <p className="mt-4 break-words text-base">{data.look.contactInfo}</p>}
              {contactRows.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {contactRows.map(({ icon: Icon, label, href }) => (
                    <li key={label} className="flex min-w-0 items-start gap-3 text-base">
                      <Icon className="mt-1 h-4 w-4 shrink-0 opacity-70" />
                      {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="min-w-0 break-words underline-offset-4 hover:underline">{label}</a> : <span className="min-w-0 break-words">{label}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {!isOwner && (
                <button type="button" onClick={() => enquire(null)} className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-[#F5C518] px-6 text-sm font-semibold text-black hover:bg-[#E0B310]" data-pdf-ignore data-testid="pf-contact-message">
                  <FiMessageCircle className="h-4 w-4" />{viewer ? `Message ${owner.name?.split(' ')[0] || 'them'} on BeeBark` : 'Join BeeBark to send a message'}
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      <Dialog open={!!viewingItem} onOpenChange={(open) => { if (!open) setProject(null); }}>
        {viewingItem && (
          <DialogContent className={PROJECT_VIEWER_DIALOG_CLASS} aria-describedby={undefined}>
            <DialogTitle className="sr-only">{viewingItem.title}</DialogTitle>
            <ProjectViewer
              key={viewingItem._id}
              item={viewingItem}
              index={viewingIndex}
              total={items.length}
              initialPhoto={viewerPhoto}
              onPrev={() => showAt(viewingIndex - 1)}
              onNext={() => showAt(viewingIndex + 1)}
              onClose={() => setProject(null)}
              actions={(
                <>
                  {viewingItem.kind === 'product' && !isOwner && (
                    <button type="button" onClick={() => enquire(viewingItem)} className="inline-flex h-9 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white hover:bg-gray-800" data-testid="project-viewer-enquire">
                      <FiMessageCircle className="h-4 w-4" />Get a quote
                    </button>
                  )}
                  {canReport && (
                    <button type="button" onClick={() => toggleSave(viewingItem)} className={`${pillBtn} ${viewingItem.isSaved ? 'text-[#E0A21A]' : ''}`} data-testid="project-viewer-save" aria-pressed={!!viewingItem.isSaved} aria-label={viewingItem.isSaved ? 'Saved' : 'Save project'}>
                      <FiBookmark className={`h-4 w-4 ${viewingItem.isSaved ? 'fill-current' : ''}`} /><span className="hidden sm:inline">{viewingItem.isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  )}
                  {canReport && (
                    <button type="button" onClick={() => setReportOpen(true)} className={`${pillBtn} text-red-600`} data-testid="project-viewer-report" aria-label="Report project">
                      <FiFlag className="h-4 w-4" /><span className="hidden sm:inline">Report</span>
                    </button>
                  )}
                  <ShareMenu
                    path={`/portfolio/${owner.username || username}?project=${viewingItem._id}`}
                    title={viewingItem.title}
                    text={owner.name ? `by ${owner.name}` : ''}
                    testId="project-viewer-share"
                    trigger={(
                      <button type="button" className={pillBtn} data-testid="project-viewer-share" aria-label="Share project">
                        <FiShare2 className="h-4 w-4" /><span className="hidden sm:inline">Share</span>
                      </button>
                    )}
                  />
                </>
              )}
            />
          </DialogContent>
        )}
      </Dialog>

      <QuoteDialog
        open={!!quoteFor}
        onOpenChange={(o) => { if (!o) setQuoteFor(null); }}
        username={owner.username || username}
        ownerName={owner.business?.name || owner.name}
        item={quoteFor?.item}
      />

      {canReport && viewingItem && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          person={{ _id: owner._id, name: owner.name }}
          context="portfolio"
          itemId={viewingItem._id}
          itemTitle={viewingItem.title}
        />
      )}
    </div>
  );
};

export default PublicPortfolio;
