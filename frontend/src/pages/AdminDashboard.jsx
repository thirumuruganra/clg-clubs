import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import wavcIcon from '../assets/WAVC-edit.png';

const API = '';

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
  const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', start_time: '', end_time: '', tag: 'TECH', image_url: '' });
  const [creating, setCreating] = useState(false);

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
    setCreating(true);
    try {
      const body = { ...newEvent, club_id: club.id };
      if (body.start_time) body.start_time = new Date(body.start_time).toISOString();
      if (body.end_time) body.end_time = new Date(body.end_time).toISOString();

      const res = await fetch(`${API}/api/events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewEvent({ title: '', description: '', location: '', start_time: '', end_time: '', tag: 'TECH', image_url: '' });
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

  if (loading || loadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
      <div className="animate-pulse text-lg">Loading admin panel...</div>
    </div>
  );

  // Stats
  const totalEvents = events.length;
  const totalRSVPs = events.reduce((sum, e) => sum + (e.rsvp_count || 0), 0);

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
      <aside className={`fixed inset-y-0 left-0 z-40 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 flex-shrink-0 border-r border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col transition-transform duration-300 ease-in-out`}>
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
            {user?.picture ? (
              <img src={user.picture} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{(user?.name || 'A')[0]}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-[#637588] dark:text-[#92adc9]">Head Administrator</p>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-[#233648] transition-colors">
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
            <button className="lg:hidden p-1 rounded hover:bg-[#233648] transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <label className="flex items-stretch rounded-xl h-10 bg-[#f0f2f4] dark:bg-[#233648] md:min-w-[300px] w-full max-w-md">
              <div className="flex items-center justify-center pl-4"><span className="material-symbols-outlined text-[20px] text-[#637588]">search</span></div>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm px-3 focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1 w-full" placeholder="Search events..." />
            </label>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-[#233648]"><span className="material-symbols-outlined text-[20px]">notifications</span></button>
            <button className="p-2 rounded-full hover:bg-[#233648]"><span className="material-symbols-outlined text-[20px]">settings</span></button>
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
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#233648] text-white text-sm font-medium hover:bg-[#34485c] transition-colors">
                <span className="material-symbols-outlined text-[18px]">tune</span> Filters
              </button>
              <button onClick={() => document.getElementById('quickCreateTitle')?.focus()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[18px]">add</span> Create New Event
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            {[
              { label: 'Total Upcoming Events', value: totalEvents, icon: 'event_available', badge: `+${Math.min(totalEvents, 2)} this week`, color: 'primary' },
              { label: 'Active "I\'m Going" Clicks', value: totalRSVPs, icon: 'group', badge: '+15%', color: 'primary' },
              { label: 'Avg. Attendance Rate', value: '85%', icon: 'trending_up', badge: '+5%', color: 'primary' },
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
                <h2 className="text-xl font-bold">Upcoming Event RSVP Tracker</h2>
                <button className="text-primary text-sm font-bold hover:underline">View All</button>
              </div>
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-[#e5e7eb] dark:border-[#233648] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] dark:border-[#233648]">
                      {['Event Name', 'Category', 'Date', "I'm Going", 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#637588] italic">No events yet. Create your first event!</td></tr>
                    )}
                    {events.filter(e => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase())).map(event => (
                      <tr key={event.id} className="border-b border-[#e5e7eb] dark:border-[#233648] hover:bg-[#f9fafb] dark:hover:bg-[#233648]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-gray-700 bg-cover bg-center flex-shrink-0" style={event.image_url ? { backgroundImage: `url("${event.image_url}")` } : {}}></div>
                            <div>
                              <p className="text-sm font-bold">{event.title}</p>
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
                            <button className="p-1.5 rounded-lg hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[18px] text-[#637588]">edit</span></button>
                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-[18px] text-red-400">delete</span></button>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Date & Start</label>
                    <input type="datetime-local" required value={newEvent.start_time} onChange={e => setNewEvent(p => ({ ...p, start_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">End Time</label>
                    <input type="datetime-local" required value={newEvent.end_time} onChange={e => setNewEvent(p => ({ ...p, end_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
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
    </div>
  );
};

export default AdminDashboard;
