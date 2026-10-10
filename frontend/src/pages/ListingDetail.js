import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiFlag, FiHome, FiMapPin, FiMaximize, FiMessageCircle, FiEdit2 } from 'react-icons/fi';
import ShareMenu from '../components/ShareMenu';
import BeeLoader from '../components/BeeLoader';
import ReportDialog from '../components/ReportDialog';
import { API_URL } from '../config/api';
import { personHeadline } from '../utils/personHeadline';

const TYPE = { apartment: 'Apartment', villa: 'Villa', house: 'Independent house', plot: 'Plot / land', office: 'Office', retail: 'Shop / retail', warehouse: 'Warehouse', other: 'Property' };
const UNIT = { sqft: 'sq ft', sqm: 'sq m', acre: 'acre' };
const PER = { per_month: ' / month', per_sqft: ' / sq ft', total: '' };
const STATUS = { active: 'Available', under_offer: 'Under offer', sold: 'Sold', rented: 'Rented', draft: 'Draft' };

const formatPrice = (n) => {
  if (n === null || n === undefined) return 'Price on request';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

// A single property listing, for sharing and enquiries
const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/listings/${id}`).then((res) => setData(res.data)).catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <div className="min-h-screen bg-[#F7F6F4]"><Sidebar /><TopBar />
        <div className="lg:ml-64 mt-16 p-8 text-center">
          <p className="text-gray-600 mb-3">This listing isn't available any more.</p>
          <Link to="/dashboard" className="font-semibold text-black hover:underline">Back to BeeBark</Link>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-16 lg:left-64 flex items-center justify-center"><BeeLoader size="section" label="Opening the listing" /></div>
    );
  }

  const { listing, isOwner } = data;
  const owner = listing.user;
  const images = listing.images || [];
  const facts = [
    TYPE[listing.propertyType],
    listing.bedrooms ? `${listing.bedrooms} BHK` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.area ? `${Number(listing.area).toLocaleString('en-IN')} ${UNIT[listing.areaUnit] || 'sq ft'}` : null
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F7F6F4]" data-testid="listing-detail">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black"><FiArrowLeft />Back</button>

          <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[16/9]">
            {images.length ? <img src={images[photo]} alt={listing.title} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-gray-300"><FiHome className="w-16 h-16" /></div>}
            {images.length > 1 && (
              <>
                <button onClick={() => setPhoto((p) => (p - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow" aria-label="Previous photo"><FiChevronLeft /></button>
                <button onClick={() => setPhoto((p) => (p + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow" aria-label="Next photo"><FiChevronRight /></button>
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">{photo + 1} / {images.length}</span>
              </>
            )}
            <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white capitalize">For {listing.purpose}</span>
            <span className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black">{STATUS[listing.status]}</span>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button key={src} onClick={() => setPhoto(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${i === photo ? 'border-yellow-400' : 'border-transparent'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-black/5 bg-white p-5 sm:p-8 space-y-4">
              <div>
                <p className="text-3xl font-bold text-black font-serif">{formatPrice(listing.price)}<span className="text-base font-normal text-gray-500">{listing.price !== null && listing.price !== undefined ? PER[listing.priceUnit] : ''}</span></p>
                <h1 className="text-xl font-semibold text-black mt-1">{listing.title}</h1>
                {listing.location && <p className="flex items-center gap-1 text-sm text-gray-600 mt-1"><FiMapPin />{listing.location}</p>}
              </div>
              {facts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {facts.map((f) => <span key={f} className="inline-flex items-center gap-1 rounded-full bg-[#F6F4EF] px-3 py-1 text-sm text-gray-700">{f === facts[3] && <FiMaximize className="w-3 h-3" />}{f}</span>)}
                </div>
              )}
              {listing.description && <p className="text-gray-700 whitespace-pre-line leading-relaxed">{listing.description}</p>}
              {listing.amenities?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-black mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-2">{listing.amenities.map((a) => <span key={a} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">{a}</span>)}</div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6 space-y-4 h-fit">
              <Link to={`/profile/${owner.username}`} className="flex items-center gap-3 hover:opacity-80">
                <Avatar className="w-12 h-12"><AvatarImage src={owner.profilePic} /><AvatarFallback className="bg-yellow-400 font-semibold">{owner.name?.charAt(0)}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-black truncate">{owner.name}</p>
                  <p className="text-xs text-gray-500 truncate">{owner.headline || personHeadline(owner)}</p>
                </div>
              </Link>
              {isOwner ? (
                <Link to="/listings"><Button className="w-full bg-[#32281F] text-white hover:bg-[#221A14]"><FiEdit2 className="mr-2" />Manage listing</Button></Link>
              ) : (
                <Button
                  onClick={() => {
                    axios.post(`${API_URL}/api/profile/${owner._id}/event`, { type: 'enquiry', item: listing._id }, { silent: true }).catch(() => {});
                    navigate(`/chat?with=${owner._id}&draft=${encodeURIComponent(`Hi ${owner.name.split(' ')[0]}, I'm interested in "${listing.title}". Is it still available?`)}`);
                  }}
                  className="w-full bg-[#32281F] hover:bg-[#221A14] text-white font-semibold"
                  data-testid="listing-enquire"
                >
                  <FiMessageCircle className="mr-2" />Enquire
                </Button>
              )}
              <div className="flex gap-2">
                <div className="flex-1 [&>button]:w-full [&>button]:justify-center">
                  <ShareMenu path={`/listing/${listing._id}`} title={listing.title} text={`${formatPrice(listing.price)}${listing.location ? ` · ${listing.location}` : ''}`} testId="listing-share" />
                </div>
                {!isOwner && (
                  <Button variant="outline" onClick={() => setReportOpen(true)} data-testid="listing-report" aria-label="Report listing"><FiFlag /></Button>
                )}
              </div>
              {!isOwner && <p className="text-xs text-gray-400">Enquiries go to {owner.name.split(' ')[0]}'s messages. You need to be connected to message.</p>}
            </div>
          </div>
        </div>
      </div>
      {!isOwner && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} person={owner} context="listing" itemId={listing._id} itemTitle={listing.title} />
      )}
    </div>
  );
};

export default ListingDetail;
