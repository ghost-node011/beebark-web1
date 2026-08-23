import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { API_URL } from '../config/api';
import { TEMPLATES } from '../components/portfolio/PortfolioTemplates';
import { exportPortfolioPdf } from '../utils/exportPortfolioPdf';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';

const PublicPortfolio = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/portfolio/${username}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [username]);

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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  const Template = TEMPLATES[data.theme] || TEMPLATES.grid;

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
          <Template items={data.items} user={data.user} headline={data.headline} editable={false} font={data.font} accentColor={data.accentColor} />
        </div>
      )}
    </div>
  );
};

export default PublicPortfolio;
