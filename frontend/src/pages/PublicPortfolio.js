import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { resolveTemplate, ProjectViewer, PROJECT_VIEWER_DIALOG_CLASS } from '../components/portfolio/PortfolioTemplates';
import ShareMenu from '../components/ShareMenu';
import ReportDialog from '../components/ReportDialog';
import { exportPortfolioPdf } from '../utils/exportPortfolioPdf';
import BeeLoader from '../components/BeeLoader';
import { FiArrowLeft, FiDownload, FiShare2, FiFlag } from 'react-icons/fi';

const PublicPortfolio = () => {
  const { username } = useParams();
  const { user: viewer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const captureRef = useRef(null);
  const missingWarned = useRef(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/portfolio/${username}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [username]);

  // The open project lives in the URL (?project=<id>) so it can be shared
  const projectId = searchParams.get('project');
  const items = data?.items || [];
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
      {data.items.length === 0 ? (
        <p className="text-gray-500 px-4 sm:px-6">This portfolio is empty for now.</p>
      ) : (
        <div ref={captureRef}>
          <Template items={data.items} user={data.user} headline={data.headline} editable={false} onOpen={openProject} font={data.font} accentColor={data.accentColor} look={data.look} />
        </div>
      )}

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
