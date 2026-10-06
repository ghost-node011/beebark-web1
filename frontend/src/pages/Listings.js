import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { FiPlus, FiMapPin, FiEdit2, FiTrash2, FiSearch, FiHome, FiUpload, FiX, FiMaximize } from 'react-icons/fi';
import { LocationInput } from '../components/AutocompleteInput';
import { API_URL } from '../config/api';

const PURPOSES = [{ value: 'sale', label: 'For sale' }, { value: 'rent', label: 'For rent' }, { value: 'lease', label: 'For lease' }];
const TYPES = [
  { value: 'apartment', label: 'Apartment' }, { value: 'villa', label: 'Villa' }, { value: 'house', label: 'Independent house' },
  { value: 'plot', label: 'Plot / land' }, { value: 'office', label: 'Office' }, { value: 'retail', label: 'Shop / retail' },
  { value: 'warehouse', label: 'Warehouse' }, { value: 'other', label: 'Other' }
];
const STATUSES = [
  { value: 'active', label: 'Active', chip: 'bg-green-100 text-green-700' },
  { value: 'under_offer', label: 'Under offer', chip: 'bg-yellow-100 text-yellow-800' },
  { value: 'sold', label: 'Sold', chip: 'bg-gray-200 text-gray-700' },
  { value: 'rented', label: 'Rented', chip: 'bg-gray-200 text-gray-700' },
  { value: 'draft', label: 'Draft', chip: 'bg-blue-50 text-blue-700' }
];
const PRICE_UNITS = [{ value: 'total', label: 'Total' }, { value: 'per_month', label: 'per month' }, { value: 'per_sqft', label: 'per sq ft' }];
const AREA_UNITS = [{ value: 'sqft', label: 'sq ft' }, { value: 'sqm', label: 'sq m' }, { value: 'acre', label: 'acre' }];
const AMENITIES = ['Parking', 'Lift', 'Power backup', 'Security', 'Gym', 'Swimming pool', 'Garden', 'Furnished', 'Semi-furnished', 'Gated community', 'Clubhouse', 'Vastu compliant'];

const label = (list, v) => list.find((x) => x.value === v)?.label || '';
const selectClass = 'w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400';

// ₹1.2 Cr, ₹45 L, ₹25,000
const formatPrice = (n) => {
  if (n === null || n === undefined) return 'Price on request';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 ? 2 : 0).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 ? 2 : 0).replace(/\.?0+$/, '')} L`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

const EMPTY = {
  title: '', description: '', purpose: 'sale', propertyType: 'apartment', price: '', priceUnit: 'total',
  area: '', areaUnit: 'sqft', bedrooms: '', bathrooms: '', location: '', images: [], amenities: [], status: 'active'
};

const Listings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const lastDraft = useRef(null);
  if (draft) lastDraft.current = draft;
  const form = draft || lastDraft.current;
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    axios.get(`${API_URL}/api/listings`, { params: { user: 'me', status: status || undefined, q: q.trim() || undefined } })
      .then((res) => setListings(res.data.listings || []))
      .catch(() => toast.error('Could not load listings'))
      .finally(() => setLoading(false));
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const upload = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    try {
      const body = new FormData();
      list.forEach((f) => body.append('images', f));
      const res = await axios.post(`${API_URL}/api/upload/multiple`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const urls = (res.data.images || []).map((i) => i.url);
      setDraft((d) => ({ ...d, images: [...d.images, ...urls].slice(0, 20) }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not upload photos');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Add a title');
    setSaving(true);
    const { _id } = draft;
    const body = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, draft[k]]));
    try {
      if (_id) await axios.put(`${API_URL}/api/listings/${_id}`, body);
      else await axios.post(`${API_URL}/api/listings`, body);
      toast.success(_id ? 'Listing updated' : 'Listing added');
      setDraft(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save listing');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l) => {
    if (!window.confirm(`Delete "${l.title}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/listings/${l._id}`);
      setListings((list) => list.filter((x) => x._id !== l._id));
      toast.success('Listing deleted');
    } catch {
      toast.error('Could not delete listing');
    }
  };

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const toForm = (l) => ({ ...EMPTY, ...l, price: l.price ?? '', area: l.area ?? '', bedrooms: l.bedrooms ?? '', bathrooms: l.bathrooms ?? '' });
  const showRooms = form && !['plot', 'warehouse', 'retail'].includes(form.propertyType);

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="listings-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black">Listings</h1>
              <p className="text-gray-600 mt-1">Properties you're selling or renting out.</p>
            </div>
            <Button onClick={() => setDraft({ ...EMPTY })} className="bg-yellow-400 hover:bg-yellow-500 text-black" data-testid="listing-add">
              <FiPlus className="mr-1" />Add listing
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or location" className="pl-9 bg-white" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {[{ value: '', label: 'All' }, ...STATUSES].map((s) => (
                <button key={s.value} onClick={() => setStatus(s.value)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${status === s.value ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-gray-400 text-center py-12">Loading...</p>
          ) : listings.length === 0 ? (
            <Card className="py-16 text-center">
              <FiHome className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">{q || status ? 'No listings match' : 'No listings yet'}</p>
              {!q && !status && <p className="text-sm text-gray-500 mt-1">Add your first property with photos, price and area.</p>}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((l) => {
                const st = STATUSES.find((s) => s.value === l.status) || STATUSES[0];
                return (
                  <Card key={l._id} className="overflow-hidden group" data-testid={`listing-${l._id}`}>
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {l.images?.[0] ? <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><FiHome className="w-10 h-10" /></div>}
                      <span className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.chip}`}>{st.label}</span>
                      <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white">{label(PURPOSES, l.purpose)}</span>
                      {l.images?.length > 1 && <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 text-[10px] text-white">{l.images.length} photos</span>}
                    </div>
                    <div className="p-4 space-y-1.5">
                      <p className="text-lg font-bold text-black">
                        {formatPrice(l.price)}
                        {l.price !== null && l.priceUnit !== 'total' && <span className="text-sm font-normal text-gray-500"> {label(PRICE_UNITS, l.priceUnit)}</span>}
                      </p>
                      <p className="font-medium text-black truncate">{l.title}</p>
                      <p className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                        <span>{label(TYPES, l.propertyType)}</span>
                        {l.bedrooms ? <span>{l.bedrooms} BHK</span> : null}
                        {l.area ? <span className="flex items-center gap-1"><FiMaximize className="w-3 h-3" />{Number(l.area).toLocaleString('en-IN')} {label(AREA_UNITS, l.areaUnit)}</span> : null}
                      </p>
                      {l.location && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><FiMapPin className="w-3 h-3 shrink-0" />{l.location}</p>}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => setDraft(toForm(l))} className="flex-1"><FiEdit2 className="mr-1" />Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => remove(l)} className="text-red-600 hover:text-red-700" aria-label={`Delete ${l.title}`}><FiTrash2 /></Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?._id ? 'Edit listing' : 'New listing'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="l-title">Title *</Label>
                <Input id="l-title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. 3 BHK sea-facing apartment in Bandra West" spellCheck data-testid="listing-title" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Purpose</Label>
                  <select value={form.purpose} onChange={(e) => set({ purpose: e.target.value, priceUnit: e.target.value === 'sale' ? 'total' : 'per_month' })} className={selectClass}>
                    {PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Property type</Label>
                  <select value={form.propertyType} onChange={(e) => set({ propertyType: e.target.value })} className={selectClass}>
                    {TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={selectClass}>
                    {STATUSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="l-price">Price (₹)</Label>
                  <div className="flex gap-2">
                    <Input id="l-price" type="number" min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="Leave empty for 'on request'" data-testid="listing-price" />
                    <select value={form.priceUnit} onChange={(e) => set({ priceUnit: e.target.value })} className={`${selectClass} w-28 shrink-0`} aria-label="Price unit">
                      {PRICE_UNITS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  {form.price !== '' && <p className="text-xs text-gray-500">{formatPrice(Number(form.price))}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-area">Area</Label>
                  <div className="flex gap-2">
                    <Input id="l-area" type="number" min="0" value={form.area} onChange={(e) => set({ area: e.target.value })} />
                    <select value={form.areaUnit} onChange={(e) => set({ areaUnit: e.target.value })} className={`${selectClass} w-24 shrink-0`} aria-label="Area unit">
                      {AREA_UNITS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                {showRooms && (
                  <>
                    <div className="space-y-1"><Label htmlFor="l-bed">Bedrooms</Label><Input id="l-bed" type="number" min="0" max="20" value={form.bedrooms} onChange={(e) => set({ bedrooms: e.target.value })} /></div>
                    <div className="space-y-1"><Label htmlFor="l-bath">Bathrooms</Label><Input id="l-bath" type="number" min="0" max="20" value={form.bathrooms} onChange={(e) => set({ bathrooms: e.target.value })} /></div>
                  </>
                )}
              </div>
              <div className="space-y-1"><Label>Location</Label><LocationInput value={form.location} onChange={(v) => set({ location: v })} placeholder="Locality, city" /></div>
              <div className="space-y-1">
                <Label>Photos</Label>
                <div className="flex flex-wrap gap-2">
                  {form.images.map((url, i) => (
                    <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center">Cover</span>}
                      <button type="button" onClick={() => set({ images: form.images.filter((x) => x !== url) })} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove photo"><FiX className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-xs text-gray-500 cursor-pointer hover:border-gray-400">
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
                    <FiUpload className="w-4 h-4 mb-0.5" />{uploading ? 'Uploading' : 'Add'}
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES.map((a) => {
                    const on = form.amenities.includes(a);
                    return (
                      <button key={a} type="button" onClick={() => set({ amenities: on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a] })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1"><Label htmlFor="l-desc">Description</Label><Textarea id="l-desc" rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} spellCheck placeholder="Floor, facing, nearby schools and transport, possession date..." /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving || uploading} className="bg-black text-white hover:bg-gray-800" data-testid="listing-save">{saving ? 'Saving...' : 'Save listing'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Listings;
