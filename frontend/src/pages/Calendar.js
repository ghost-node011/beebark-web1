import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { FiChevronLeft, FiChevronRight, FiPlus, FiMapPin, FiClock, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { LocationInput } from '../components/AutocompleteInput';
import { API_URL } from '../config/api';

const TYPES = [
  { value: 'meeting', label: 'Meeting', dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700' },
  { value: 'interview', label: 'Interview', dot: 'bg-purple-500', chip: 'bg-purple-50 text-purple-700' },
  { value: 'site_visit', label: 'Site visit', dot: 'bg-green-600', chip: 'bg-green-50 text-green-700' },
  { value: 'deadline', label: 'Deadline', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700' },
  { value: 'reminder', label: 'Reminder', dot: 'bg-yellow-500', chip: 'bg-yellow-50 text-yellow-800' },
  { value: 'other', label: 'Other', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-700' }
];
const typeOf = (v) => TYPES.find((t) => t.value === v) || TYPES[TYPES.length - 1];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const time12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};
const EMPTY = { title: '', type: 'meeting', date: '', startTime: '', endTime: '', location: '', notes: '' };

const CalendarPage = () => {
  const today = ymd(new Date());
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(today);
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState(null); // { _id?, ...fields }
  const [saving, setSaving] = useState(false);
  const lastDraft = useRef(null);
  if (draft) lastDraft.current = draft;
  const form = draft || lastDraft.current;

  // Whole weeks (Monday first) covering the month: 4 to 6 rows, no all-next-month row
  const days = useMemo(() => {
    const lead = (month.getDay() + 6) % 7;
    const inMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const count = Math.ceil((lead + inMonth) / 7) * 7;
    const start = new Date(month);
    start.setDate(1 - lead);
    return Array.from({ length: count }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  const load = useCallback(() => {
    axios.get(`${API_URL}/api/calendar`, { params: { from: ymd(days[0]), to: ymd(days[days.length - 1]) } })
      .then((res) => setEvents(res.data.events || []))
      .catch(() => toast.error('Could not load your calendar'));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map = {};
    for (const e of events) (map[e.date] = map[e.date] || []).push(e);
    return map;
  }, [events]);

  const dayEvents = byDay[selectedDay] || [];
  const upcoming = events.filter((e) => e.date >= today).slice(0, 5);

  const shiftMonth = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const goToday = () => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(today); };

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Give it a title');
    if (!draft.date) return toast.error('Pick a date');
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) return toast.error('End time must be after the start time');
    setSaving(true);
    const { _id, ...body } = draft;
    try {
      if (_id) await axios.put(`${API_URL}/api/calendar/${_id}`, body);
      else await axios.post(`${API_URL}/api/calendar`, body);
      toast.success(_id ? 'Event updated' : 'Event added');
      setSelectedDay(body.date);
      const d = fromYmd(body.date);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      setDraft(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save event');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/calendar/${event._id}`);
      setEvents((list) => list.filter((e) => e._id !== event._id));
      toast.success('Event deleted');
    } catch {
      toast.error('Could not delete event');
    }
  };

  const EventRow = ({ e, showDate }) => {
    const t = typeOf(e.type);
    return (
      <div className="group flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${t.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-black text-sm">{e.title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
            {showDate && <span>{fromYmd(e.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
            <span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{e.startTime ? `${time12(e.startTime)}${e.endTime ? ` – ${time12(e.endTime)}` : ''}` : 'All day'}</span>
            {e.location && <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" />{e.location}</span>}
          </div>
          {e.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{e.notes}</p>}
        </div>
        <span className={`hidden sm:inline text-[10px] font-semibold rounded px-1.5 py-0.5 ${t.chip}`}>{t.label}</span>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={() => setDraft({ ...EMPTY, ...e })} className="p-1.5 text-gray-400 hover:text-black" aria-label={`Edit ${e.title}`}><FiEdit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => remove(e)} className="p-1.5 text-gray-400 hover:text-red-600" aria-label={`Delete ${e.title}`}><FiTrash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="calendar-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black">Calendar</h1>
              <p className="text-gray-600 mt-1">Meetings, interviews, site visits and deadlines in one place.</p>
            </div>
            <Button onClick={() => setDraft({ ...EMPTY, date: selectedDay })} className="bg-yellow-400 hover:bg-yellow-500 text-black" data-testid="calendar-add">
              <FiPlus className="mr-1" />Add event
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-4 sm:p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
                  <button onClick={() => shiftMonth(-1)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Previous month"><FiChevronLeft /></button>
                  <button onClick={() => shiftMonth(1)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Next month"><FiChevronRight /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-1">
                {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                {days.map((d) => {
                  const key = ymd(d);
                  const inMonth = d.getMonth() === month.getMonth();
                  const list = byDay[key] || [];
                  const isSelected = key === selectedDay;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(key)}
                      onDoubleClick={() => setDraft({ ...EMPTY, date: key })}
                      className={`flex min-w-0 flex-col items-stretch justify-start h-14 sm:h-24 px-1 pt-2 pb-1 sm:px-1.5 sm:pt-4 text-left transition ${isSelected ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-400' : 'bg-white hover:bg-gray-50'}`}
                      aria-label={`${d.toDateString()}, ${list.length} event${list.length === 1 ? '' : 's'}`}
                    >
                      <span className={`self-center shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full text-sm ${key === today ? 'bg-black text-white font-bold' : inMonth ? 'text-black' : 'text-gray-300'}`}>{d.getDate()}</span>
                      <div className="hidden sm:block min-w-0 space-y-0.5 mt-0.5 overflow-hidden">
                        {list.slice(0, 2).map((e) => (
                          <p key={e._id} className={`truncate rounded px-1 text-[10px] font-medium ${typeOf(e.type).chip}`}>{e.startTime ? `${time12(e.startTime)} ` : ''}{e.title}</p>
                        ))}
                        {list.length > 2 && <p className="text-[10px] text-gray-500 px-1">+{list.length - 2} more</p>}
                      </div>
                      <div className="flex sm:hidden gap-0.5 mt-0.5 justify-center">
                        {list.slice(0, 3).map((e) => <span key={e._id} className={`w-1.5 h-1.5 rounded-full ${typeOf(e.type).dot}`} />)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-black">{selectedDay === today ? 'Today' : fromYmd(selectedDay).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                  <button onClick={() => setDraft({ ...EMPTY, date: selectedDay })} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-black" aria-label="Add event on this day"><FiPlus /></button>
                </div>
                {dayEvents.length ? (
                  <div className="space-y-2">{dayEvents.map((e) => <EventRow key={e._id} e={e} />)}</div>
                ) : <p className="text-sm text-gray-500">Nothing planned.</p>}
              </Card>
              <Card className="p-4 sm:p-6">
                <h2 className="font-semibold text-black mb-3">Coming up</h2>
                {upcoming.length ? (
                  <div className="space-y-2">{upcoming.map((e) => <EventRow key={e._id} e={e} showDate />)}</div>
                ) : <p className="text-sm text-gray-500">No upcoming events this month.</p>}
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?._id ? 'Edit event' : 'New event'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ev-title">Title</Label>
                <Input id="ev-title" value={form.title} onChange={(e) => setDraft({ ...form, title: e.target.value })} placeholder="e.g. Client meeting at site" autoFocus spellCheck data-testid="event-title" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setDraft({ ...form, type: t.value })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${form.type === t.value ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />{t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1"><Label htmlFor="ev-date">Date</Label><Input id="ev-date" type="date" value={form.date} onChange={(e) => setDraft({ ...form, date: e.target.value })} data-testid="event-date" /></div>
                <div className="space-y-1"><Label htmlFor="ev-start">Start</Label><Input id="ev-start" type="time" value={form.startTime} onChange={(e) => setDraft({ ...form, startTime: e.target.value })} /></div>
                <div className="space-y-1"><Label htmlFor="ev-end">End</Label><Input id="ev-end" type="time" value={form.endTime} onChange={(e) => setDraft({ ...form, endTime: e.target.value })} /></div>
              </div>
              <p className="text-xs text-gray-400 -mt-1">Leave the times empty for an all-day event.</p>
              <div className="space-y-1"><Label>Location</Label><LocationInput value={form.location} onChange={(v) => setDraft((d) => ({ ...d, location: v }))} placeholder="Office, site address or video link" /></div>
              <div className="space-y-1"><Label htmlFor="ev-notes">Notes</Label><Textarea id="ev-notes" rows={3} value={form.notes} onChange={(e) => setDraft({ ...form, notes: e.target.value })} spellCheck /></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-black text-white hover:bg-gray-800" data-testid="event-save">{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
