import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import wavcIcon from '../assets/WAVC-edit.png';

const API = '';
const DESCRIPTION_WORD_LIMIT = 100;

const countWords = (value = '') => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const isDescriptionTooLong = (value = '') => countWords(value) > DESCRIPTION_WORD_LIMIT;

const pad = (value) => String(value).padStart(2, '0');

const formatLocalDateTimeForApi = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return null;

  const year = dateValue.getFullYear();
  const month = pad(dateValue.getMonth() + 1);
  const day = pad(dateValue.getDate());
  const hours = pad(dateValue.getHours());
  const minutes = pad(dateValue.getMinutes());
  const seconds = pad(dateValue.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const parseApiDateTime = (rawValue) => {
  if (!rawValue) return null;

  const normalized = String(rawValue).replace('Z', '').split('.')[0];
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hours = Number(match[4]);
    const minutes = Number(match[5]);
    const seconds = Number(match[6] || 0);
    const localDate = new Date(year, month, day, hours, minutes, seconds);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const fallback = new Date(rawValue);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [event.title, event.description, event.keywords]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const AdminDashboard = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('events');
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick Create form
  const [newEvent, setNewEvent] = useState({ title: '', description: '', keywords: '', location: '', start_time: null, end_time: null, tag: 'TECH', image_url: '' });
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [editEvent, setEditEvent] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user && user.role !== 'CLUB_ADMIN') { navigate('/dashboard'); return; }
    if (user) fetchData();
  }, [user, loading]);

  const fetchData = async () => {
    try {
      const clubsRes = await fetch(`${API}/api/clubs/`);
      if (clubsRes.ok) {
        const clubs = await clubsRes.json();
        const myClub = clubs.find(c => c.admin_id === user.id);
        if (!myClub) { navigate('/club-setup'); return; }
        setClub(myClub);
        const eventsRes = await fetch(`${API}/api/clubs/${myClub.id}/events`);
        if (eventsRes.ok) setEvents(await eventsRes.json());
      }
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!club) return;
    if (!newEvent.start_time || !newEvent.end_time) {
      alert('Please choose both start and end date/time');
      return;
    }
    if (newEvent.end_time <= newEvent.start_time) {
      alert('End time must be after start time');
      return;
    }
    if (isDescriptionTooLong(newEvent.description)) {
      alert(`Description must be ${DESCRIPTION_WORD_LIMIT} words or fewer`);
      return;
    }

    setCreating(true);
    try {
      const body = {
        ...newEvent,
        club_id: club.id,
        start_time: formatLocalDateTimeForApi(newEvent.start_time),
        end_time: formatLocalDateTimeForApi(newEvent.end_time),
      };

      const res = await fetch(`${API}/api/events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewEvent({ title: '', description: '', keywords: '', location: '', start_time: null, end_time: null, tag: 'TECH', image_url: '' });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to create event');
      }
    } catch { alert('Error creating event'); }
    finally { setCreating(false); }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`${API}/api/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const openEditModal = (event) => {
    setEditEvent({
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      start_time: parseApiDateTime(event.start_time),
      end_time: parseApiDateTime(event.end_time),
      tag: event.tag || 'TECH',
      image_url: event.image_url || '',
      keywords: event.keywords || '',
    });
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editEvent) return;
    if (!editEvent.start_time || !editEvent.end_time) {
      alert('Please choose both start and end date/time');
      return;
    }
    if (editEvent.end_time <= editEvent.start_time) {
      alert('End time must be after start time');
      return;
    }
    if (isDescriptionTooLong(editEvent.description)) {
      alert(`Description must be ${DESCRIPTION_WORD_LIMIT} words or fewer`);
      return;
    }

    setEditing(true);
    try {
      const body = {
        ...editEvent,
        start_time: formatLocalDateTimeForApi(editEvent.start_time),
        end_time: formatLocalDateTimeForApi(editEvent.end_time),
      };
      delete body.id;

      const res = await fetch(`${API}/api/events/${editEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditEvent(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to update event');
      }
    } catch { alert('Error updating event'); }
    finally { setEditing(false); }
  };

  const [rsvpModal, setRsvpModal] = useState({ open: false, event: null, rsvps: [], loading: false });

  const calculateYear = (batchStr) => {
    if (!batchStr) return '-';
    const passout = parseInt(batchStr, 10);
    if (isNaN(passout)) return '-';
    // Assume batchStr is passout batch
    const currentYear = new Date().getFullYear();
    const diff = passout - currentYear;
    // Current mapping (assuming current year is fall semester or similar):
    // If passout is 2026 and current is 2026 -> Final Year (IV)
    if (diff === 0) return 'IV';
    if (diff === 1) return 'III';
    if (diff === 2) return 'II';
    if (diff === 3) return 'I';
    if (diff < 0) return 'Alumni';
    return '-';
  };

  const openRsvpModal = async (eventObj) => {
    setRsvpModal({ open: true, event: eventObj, rsvps: [], loading: true });
    try {
      const res = await fetch(`${API}/api/rsvp/events/${eventObj.id}/rsvps`);
      if (res.ok) {
        const data = await res.json();
        setRsvpModal(prev => ({ ...prev, rsvps: data.rsvps || [], loading: false }));
      } else {
        setRsvpModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      setRsvpModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleToggleAttendance = async (rsvpId, currentStatus) => {
    const newStatus = !currentStatus;
    // Optimistic UI update
    setRsvpModal(prev => ({
      ...prev,
      rsvps: prev.rsvps.map(r => r.id === rsvpId ? { ...r, attended: newStatus } : r)
    }));
    setEvents(prev => prev.map(e => {
        if (e.id === rsvpModal.event.id) {
            return { ...e, attended_count: (e.attended_count || 0) + (newStatus ? 1 : -1) };
        }
        return e;
    }));
    try {
      const res = await fetch(`${API}/api/rsvp/rsvps/${rsvpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: newStatus })
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.error('Failed to update attendance:', e);
      // Rollback on error
      setRsvpModal(prev => ({
        ...prev,
        rsvps: prev.rsvps.map(r => r.id === rsvpId ? { ...r, attended: currentStatus } : r)
      }));
      setEvents(prev => prev.map(e => {
          if (e.id === rsvpModal.event.id) {
              return { ...e, attended_count: (e.attended_count || 0) + (currentStatus ? 1 : -1) };
          }
          return e;
      }));
    }
  };

  const exportAttendanceCSV = () => {
    const rsvps = rsvpModal.rsvps || [];
    const attended = rsvps.filter(r => r.attended);
    if (!attended.length) {
      alert('No attendees selected for export.');
      return;
    }
    const headers = ['S.NO', 'NAME', 'DEPARTMENT', 'YEAR', 'REGISTER NO'];
    const rows = attended.map((r, index) => {
      const u = r.user || {};
      return [
        index + 1,
        u.name || '-',
        u.department || '-',
        calculateYear(u.batch),
        u.register_number || '-'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const eventNameSafe = (rsvpModal.event?.title || 'event').replace(/\s+/g, '_');
    link.setAttribute('download', `${eventNameSafe}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || loadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
      <div className="animate-pulse text-lg">Loading admin panel...</div>
    </div>
  );

  // Stats
  const totalEvents = events.length;
  const totalRSVPs = events.reduce((sum, e) => sum + (e.rsvp_count || 0), 0);
  const totalAttended = events.reduce((sum, e) => sum + (e.attended_count || 0), 0);
  const attendanceRate = totalRSVPs > 0 ? Math.round((totalAttended / totalRSVPs) * 100) : 0;

  const sideNavItems = [
    { label: 'Dashboard', icon: 'dashboard', tab: 'dashboard' },
    { label: 'Event Management', icon: 'event', tab: 'events' },
    { label: 'Members', icon: 'group', tab: 'members' },
    { label: 'Analytics', icon: 'analytics', tab: 'analytics' },
  ];

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 shrink-0 border-r border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col transition-transform duration-300 ease-in-out`}>
        <div className="p-6 border-b border-[#233648]">
          <div className="flex items-center gap-3 mb-1">
            <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
            <div>
              <span className="text-lg font-bold">WAVC</span>
              <p className="text-xs text-[#637588] dark:text-[#92adc9]">Club Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sideNavItems.map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-[#637588] dark:text-[#92adc9] hover:bg-[#f0f2f4] dark:hover:bg-[#233648]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t border-[#233648]">
          <div className="flex items-center gap-3">
            {user?.picture && user.picture.trim() !== '' ? (
              <img
                src={user.picture}
                alt={user?.name || 'Admin'}
                className="size-10 rounded-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #137fec 0%, #0d5bab 100%)', display: user?.picture && user.picture.trim() !== '' ? 'none' : 'flex' }}>
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-[#637588] dark:text-[#92adc9]">Head Administrator</p>
            </div>
            <button onClick={logout} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors">
              <span className="material-symbols-outlined text-[20px] text-[#637588]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">
          <div className="flex items-center gap-2 flex-1">
            <button className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <label className="flex items-stretch rounded-xl h-10 bg-[#f0f2f4] dark:bg-[#233648] md:min-w-75 w-full max-w-md">
              <div className="flex items-center justify-center pl-4"><span className="material-symbols-outlined text-[20px] text-[#637588]">search</span></div>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm px-3 focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1 w-full" placeholder="Search events..." />
            </label>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Event Management</h1>
              <p className="text-[#637588] dark:text-[#92adc9] mt-1">Create, edit, and track participation for club activities.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => document.getElementById('quickCreateTitle')?.focus()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[18px]">add</span> Create New Event
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            {[
              { label: 'Total Upcoming Events', value: totalEvents, icon: 'event_available', badge: `+${Math.min(totalEvents, 2)} this week`, color: 'primary' },
              { label: 'Total Active Registrations', value: totalRSVPs, icon: 'group', badge: '+15%', color: 'primary' },
              { label: 'Avg. Attendance Rate', value: `${attendanceRate}%`, icon: 'trending_up', badge: '+5%', color: 'primary' },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-[#1a2632] rounded-xl p-6 border border-[#e5e7eb] dark:border-[#233648]">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10"><span className="material-symbols-outlined text-primary text-[24px]">{stat.icon}</span></div>
                  <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>{stat.badge}
                  </span>
                </div>
                <p className="text-sm text-[#637588] dark:text-[#92adc9] mb-1">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Events Table */}
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Upcoming Event Registration Tracker</h2>
              </div>
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-[#e5e7eb] dark:border-[#233648] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] dark:border-[#233648]">
                      {['Event Name', 'Category', 'Date', 'Registered', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#637588] italic">No events yet. Create your first event!</td></tr>
                    )}
                    {events.filter(e => eventMatchesSearch(e, searchQuery)).map(event => (
                      <tr key={event.id} className="border-b border-[#e5e7eb] dark:border-[#233648] hover:bg-[#f9fafb] dark:hover:bg-[#233648]/50 transition-colors">
                        <td className="px-4 py-3 cursor-pointer group" onClick={() => openRsvpModal(event)}>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-gray-700 bg-cover bg-center shrink-0" style={event.image_url ? { backgroundImage: `url("${event.image_url}")` } : {}}></div>
                            <div>
                              <p className="text-sm font-bold group-hover:text-primary transition-colors">{event.title}</p>
                              <p className="text-xs text-[#637588] dark:text-[#92adc9]">{event.location || 'No location'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${event.tag === 'TECH' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-400'}`}>
                            {event.tag || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{event.rsvp_count || 0}</span>
                            <div className="w-16 h-1.5 rounded-full bg-[#233648] overflow-hidden">
                              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(100, (event.rsvp_count || 0) / 2)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEditModal(event)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[18px] text-[#637588]">edit</span></button>
                            <button onClick={() => handleDeleteEvent(event.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-[18px] text-red-400">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Create */}
            <div>
              <h2 className="text-xl font-bold mb-4">Quick Create</h2>
              <form onSubmit={handleCreateEvent} className="bg-white dark:bg-[#1a2632] rounded-xl border border-[#e5e7eb] dark:border-[#233648] p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Title</label>
                  <input id="quickCreateTitle" type="text" required value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Winter Coding Bootcamp"
                    className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Short Description (max 100 words)</label>
                  <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the event..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] resize-none" />
                  <p className={`mt-1 text-xs ${isDescriptionTooLong(newEvent.description) ? 'text-red-500' : 'text-[#637588] dark:text-[#92adc9]'}`}>
                    {countWords(newEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Keywords</label>
                  <input type="text" value={newEvent.keywords} onChange={e => setNewEvent(p => ({ ...p, keywords: e.target.value }))}
                    placeholder="e.g. workshop, python, machine learning"
                    className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Date & Start</label>
                    <DatePicker
                      selected={newEvent.start_time}
                      onChange={(date) => setNewEvent((p) => ({ ...p, start_time: date }))}
                      showTimeInput
                      dateFormat="dd MMM yyyy, h:mm aa"
                      placeholderText="Select start date and time"
                      className="modern-datetime-input w-full"
                      calendarClassName="modern-datepicker-calendar"
                      popperClassName="modern-datepicker-popper"
                      popperPlacement="bottom-start"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">End Time</label>
                    <DatePicker
                      selected={newEvent.end_time}
                      onChange={(date) => setNewEvent((p) => ({ ...p, end_time: date }))}
                      showTimeInput
                      dateFormat="dd MMM yyyy, h:mm aa"
                      placeholderText="Select end date and time"
                      minDate={newEvent.start_time || undefined}
                      className="modern-datetime-input w-full"
                      calendarClassName="modern-datepicker-calendar"
                      popperClassName="modern-datepicker-popper"
                      popperPlacement="bottom-start"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-2 block">Category Tag</label>
                  <div className="flex gap-3">
                    {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map(tag => (
                      <button key={tag.value} type="button" onClick={() => setNewEvent(p => ({ ...p, tag: tag.value }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          newEvent.tag === tag.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#233648] text-[#92adc9] hover:border-[#34485c]'
                        }`}>
                        <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Location</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                    <span className="material-symbols-outlined text-[18px] text-[#637588]">location_on</span>
                    <input type="text" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      placeholder="Add location"
                      className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                  </div>
                </div>
                <button type="submit" disabled={creating}
                  className="w-full py-3 rounded-xl bg-white dark:bg-[#233648] text-[#111418] dark:text-white font-bold text-sm border border-[#e5e7eb] dark:border-[#233648] hover:bg-[#f0f2f4] dark:hover:bg-[#34485c] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? 'Publishing...' : 'Publish Event'}
                  {!creating && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      {/* Edit Event Modal */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditEvent(null)}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg border border-[#e5e7eb] dark:border-[#233648] overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
              <h2 className="text-xl font-bold">Edit Event</h2>
              <button onClick={() => setEditEvent(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <form onSubmit={handleUpdateEvent} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Title</label>
                <input type="text" required value={editEvent.title} onChange={e => setEditEvent(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Short Description (max 100 words)</label>
                <textarea value={editEvent.description} onChange={e => setEditEvent(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white resize-none" />
                <p className={`mt-1 text-xs ${isDescriptionTooLong(editEvent.description) ? 'text-red-500' : 'text-[#637588] dark:text-[#92adc9]'}`}>
                  {countWords(editEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Keywords</label>
                <input type="text" value={editEvent.keywords} onChange={e => setEditEvent(p => ({ ...p, keywords: e.target.value }))}
                  placeholder="e.g. workshop, python, machine learning"
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Start Time</label>
                  <DatePicker
                    selected={editEvent.start_time}
                    onChange={(date) => setEditEvent((p) => ({ ...p, start_time: date }))}
                    showTimeInput
                    dateFormat="dd MMM yyyy, h:mm aa"
                    placeholderText="Select start date and time"
                    className="modern-datetime-input w-full"
                    calendarClassName="modern-datepicker-calendar"
                    popperClassName="modern-datepicker-popper"
                    popperPlacement="bottom-start"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">End Time</label>
                  <DatePicker
                    selected={editEvent.end_time}
                    onChange={(date) => setEditEvent((p) => ({ ...p, end_time: date }))}
                    showTimeInput
                    dateFormat="dd MMM yyyy, h:mm aa"
                    placeholderText="Select end date and time"
                    minDate={editEvent.start_time || undefined}
                    className="modern-datetime-input w-full"
                    calendarClassName="modern-datepicker-calendar"
                    popperClassName="modern-datepicker-popper"
                    popperPlacement="bottom-start"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Location</label>
                <input type="text" value={editEvent.location} onChange={e => setEditEvent(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-2 block">Category</label>
                <div className="flex gap-3">
                  {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map(tag => (
                    <button key={tag.value} type="button" onClick={() => setEditEvent(p => ({ ...p, tag: tag.value }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        editEvent.tag === tag.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[#e5e7eb] dark:border-[#233648] text-[#637588] dark:text-[#92adc9] hover:border-[#637588]'
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Image URL</label>
                <input type="url" value={editEvent.image_url} onChange={e => setEditEvent(p => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditEvent(null)} className="flex-1 py-3 rounded-xl border border-[#e5e7eb] dark:border-[#233648] text-sm font-bold hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editing}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {editing ? 'Saving...' : 'Save Changes'}
                  {!editing && <span className="material-symbols-outlined text-[18px]">check</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RSVP / Attendance Modal */}
      {rsvpModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRsvpModal({ open: false, event: null, rsvps: [], loading: false })}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-4xl border border-[#e5e7eb] dark:border-[#233648] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
              <div>
                <h2 className="text-xl font-bold">{rsvpModal.event?.title || 'Event'} - Attendees</h2>
                <p className="text-xs text-[#637588] dark:text-[#92adc9] mt-1">{rsvpModal.rsvps.length} Students Registered</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={exportAttendanceCSV} disabled={rsvpModal.loading || rsvpModal.rsvps.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/10 text-green-600 dark:text-green-400 text-sm font-bold hover:bg-green-600/20 transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                </button>
                <button onClick={() => setRsvpModal({ open: false, event: null, rsvps: [], loading: false })} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {rsvpModal.loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : rsvpModal.rsvps.length === 0 ? (
                <div className="text-center py-12 text-[#637588] dark:text-[#92adc9]">No students have registered for this event yet.</div>
              ) : (
                <div className="border border-[#e5e7eb] dark:border-[#233648] rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#f9fafb] dark:bg-[#111a22] text-xs uppercase text-[#637588] dark:text-[#92adc9] font-bold border-b border-[#e5e7eb] dark:border-[#233648]">
                      <tr>
                        <th className="px-4 py-3">S.NO</th>
                        <th className="px-4 py-3">NAME</th>
                        <th className="px-4 py-3">DEPARTMENT</th>
                        <th className="px-4 py-3">YEAR</th>
                        <th className="px-4 py-3">REGISTER NO</th>
                        <th className="px-4 py-3 text-center border-l border-[#e5e7eb] dark:border-[#233648]">ATTENDED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#233648]">
                      {rsvpModal.rsvps.map((rsvp, index) => {
                        const u = rsvp.user || {};
                        return (
                          <tr key={rsvp.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#233648]/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{u.name || '-'}</td>
                            <td className="px-4 py-3">{u.department || '-'}</td>
                            <td className="px-4 py-3">{calculateYear(u.batch)}</td>
                            <td className="px-4 py-3 font-mono text-xs">{u.register_number || '-'}</td>
                            <td className="px-4 py-3 text-center border-l border-[#e5e7eb] dark:border-[#233648]">
                              <input 
                                type="checkbox" 
                                checked={rsvp.attended || false}
                                onChange={() => handleToggleAttendance(rsvp.id, rsvp.attended)}
                                className="w-5 h-5 rounded border-[#e5e7eb] dark:border-[#34485c] text-primary focus:ring-primary dark:bg-[#1a2632] cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
