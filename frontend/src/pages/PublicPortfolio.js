import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import { TEMPLATES } from '../components/portfolio/PortfolioTemplates';
import { FiArrowLeft } from 'react-icons/fi';

const PublicPortfolio = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/portfolio/${username}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [username]);

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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
          <FiArrowLeft />Back to BeeBark
        </Link>
        {data.items.length === 0 ? (
          <p className="text-gray-500">This portfolio is empty for now.</p>
        ) : (
          <Template items={data.items} user={data.user} headline={data.headline} editable={false} />
        )}
      </div>
    </div>
  );
};

export default PublicPortfolio;
