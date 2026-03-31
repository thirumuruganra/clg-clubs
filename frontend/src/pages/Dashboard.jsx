import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import wavcIcon from '../assets/WAVC-edit.png';

const API = '';

const Dashboard = () => {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [forYouEvents, setForYouEvents] = useState([]);
    const [discoverEvents, setDiscoverEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        const date = new Date();
        setCurrentDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
            return;
        }
        if (user && (!user.batch || !user.department)) {
            navigate('/profile');
            return;
        }
        if (user) {
            fetchEvents();
        }
    }, [user, loading]);

    const fetchEvents = async () => {
        try {
            const [forYouRes, discoverRes] = await Promise.all([
                fetch(`${API}/api/events/feed?type=following&user_id=${user.id}`),
                fetch(`${API}/api/events/feed?type=discover&user_id=${user.id}`)
            ]);
            if (forYouRes.ok) setForYouEvents(await forYouRes.json());
            if (discoverRes.ok) setDiscoverEvents(await discoverRes.json());
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleRSVP = async (eventId) => {
        try {
            const res = await fetch(`${API}/api/rsvp/events/${eventId}/rsvp?user_id=${user.id}`, { method: 'POST' });
            if (res.ok) fetchEvents();
            else {
                const data = await res.json();
                alert(data.detail || 'Already registered');
            }
        } catch (err) { console.error(err); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="animate-pulse text-white text-lg">Loading...</div>
        </div>
    );

    const name = user?.name || 'Student';
    const role = user?.role || 'STUDENT';
    const picture = user?.picture;

    const formatDate = (iso) => {
        if (!iso) return { month: '', day: '' };
        const d = new Date(iso);
        return { month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(), day: d.getDate() };
    };

    const EventCard = ({ event }) => {
        const { month, day } = formatDate(event.start_time);
        return (
            <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] hover:shadow-lg transition-shadow">
                <div className="relative h-40 bg-cover bg-center bg-gray-700" style={event.image_url ? { backgroundImage: `url("${event.image_url}")` } : {}}>
                    <div className="absolute top-3 right-3 rounded-lg bg-white/90 dark:bg-[#111a22]/90 px-2 py-1 text-center backdrop-blur-sm shadow-sm">
                        <p className="text-xs font-bold text-primary uppercase">{month}</p>
                        <p className="text-lg font-bold text-[#111418] dark:text-white">{day}</p>
                    </div>
                    <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-white">{event.club_name || 'Club'}</span>
                    </div>
                </div>
                <div className="flex flex-col p-4 flex-1">
                    <h3 className="mb-1 text-lg font-bold text-[#111418] dark:text-white">{event.title}</h3>
                    <p className="mb-4 text-sm text-[#637588] dark:text-[#92adc9] line-clamp-2">{event.description}</p>
                    <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[#637588] dark:text-[#92adc9]">
                            <span className="material-symbols-outlined text-[16px]">group</span>
                            <span className="text-xs font-medium">{event.rsvp_count || 0} going</span>
                        </div>
                        <button
                            onClick={() => handleRSVP(event.id)}
                            disabled={event.is_rsvped}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${event.is_rsvped ? 'bg-green-500/10 text-green-500 cursor-default' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                            {event.is_rsvped ? '✓ Registered' : 'Register'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const DiscoverItem = ({ event }) => {
        const { month, day } = formatDate(event.start_time);
        return (
            <div className="flex flex-row overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] h-40 hover:shadow-lg transition-shadow">
                <div className="w-1/3 bg-cover bg-center bg-gray-700" style={event.image_url ? { backgroundImage: `url("${event.image_url}")` } : {}}></div>
                <div className="flex w-2/3 flex-col p-4 justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{event.club_name || 'Club'}</span>
                            <span className="text-xs text-[#637588] dark:text-[#92adc9] font-medium bg-[#f0f2f4] dark:bg-[#233648] px-2 py-0.5 rounded">{month} {day}</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#111418] dark:text-white leading-tight">{event.title}</h3>
                        {event.location && (
                            <div className="flex items-center gap-1 mt-2 text-[#637588] dark:text-[#92adc9]">
                                <span className="material-symbols-outlined text-[16px]">location_on</span>
                                <span className="text-xs">{event.location}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-end">
                        <button onClick={() => navigate(`/calendar`)} className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] dark:border-[#233648] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                            More Info
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display overflow-x-hidden text-slate-900 dark:text-white">
            <div className="layout-container flex h-full grow flex-col">
                {/* Header */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] dark:border-[#233648] px-4 md:px-10 py-3 bg-white dark:bg-[#111a22]">
                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="flex items-center gap-4 text-[#111418] dark:text-white cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <div className="size-8 text-primary flex items-center justify-center">
                                <img src={wavcIcon} alt="WAVC Logo" className="w-full h-full object-contain" />
                            </div>
                            <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">WAVC</h2>
                        </div>
                        <label className="hidden md:flex flex-col min-w-40 !h-10 max-w-64">
                            <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                                <div className="text-[#637588] dark:text-[#92adc9] flex border-none bg-[#f0f2f4] dark:bg-[#233648] items-center justify-center pl-4 rounded-l-xl">
                                    <span className="material-symbols-outlined text-[24px]">search</span>
                                </div>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border-none bg-[#f0f2f4] dark:bg-[#233648] h-full placeholder:text-[#637588] dark:placeholder:text-[#92adc9] px-4 rounded-l-none pl-2 text-base font-normal"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </label>
                    </div>
                    <div className="flex flex-1 justify-end gap-4 md:gap-8">
                        <div className="hidden md:flex items-center gap-9">
                            <a className="text-[#111418] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="/dashboard">Dashboard</a>
                            <a className="text-[#111418] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="/calendar">Events</a>
                            {role === 'CLUB_ADMIN' && (
                                <a className="text-[#111418] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="/admin">Admin</a>
                            )}
                        </div>
                        {role === 'CLUB_ADMIN' && (
                            <button onClick={() => navigate('/admin')} className="hidden md:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                                <span className="truncate">Create Event</span>
                            </button>
                        )}
                        <button onClick={() => navigate('/profile')} className="focus:outline-none transition-transform active:scale-95">
                            {picture ? (
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-white/10" style={{ backgroundImage: `url("${picture}")` }}></div>
                            ) : (
                                <div className="size-10 rounded-full ring-2 ring-white/10 bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                    {name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-8">
                    <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                        {/* Welcome */}
                        <div className="flex justify-between items-end pb-3 pt-6 px-4">
                            <div>
                                <h1 className="text-[#111418] dark:text-white text-[32px] font-bold leading-tight">Welcome back, {name}!</h1>
                                <p className="text-[#637588] dark:text-[#92adc9] text-base mt-2">Here's what's happening around campus today.</p>
                            </div>
                            <div className="text-[#637588] dark:text-[#92adc9] text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                                <span>{currentDate}</span>
                            </div>
                        </div>

                        {/* Calendar Tile */}
                        <div className="grid grid-cols-1 gap-4 p-4">
                            <div onClick={() => navigate('/calendar')} className="group relative cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md h-80">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 transition-transform duration-500 group-hover:scale-105 bg-cover bg-center"
                                    style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuB3zrC2zWTw2D4ivcIDWAb6vufiRs4bu3TgruhnB8zNBUeKci7kXQow7VafPKRga4Lua80PMNk1-QDne8Jz2xL8sVt3D4vk8aly08_J7ECW6ibdVKe9cK___pbaTzgl6Ao0GGmlrhdkYYcHHKC28MFxi-5Mx_ilnkcmxWj5IIVBLlLxQYWXwPOekKPJDW0-W2SFeW-zf9V-A-3yzcHNOiIBjXVzDYVZKSGxx5ZgP8Wqr1aIRU71sDUnwUvmUITWOzvvnhPYUWOcoek")' }}
                                ></div>
                                <div className="absolute inset-0 flex flex-col justify-end p-8">
                                    <div className="mb-4"><span className="material-symbols-outlined rounded-full bg-white/20 p-3 text-white backdrop-blur-sm text-2xl">calendar_month</span></div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Event Calendar</h3>
                                    <p className="text-base text-gray-200 line-clamp-2 max-w-2xl">Check out all scheduled activities and plan your semester ahead.</p>
                                </div>
                            </div>
                        </div>

                        {/* For You */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between px-4 pb-4">
                                <div>
                                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold">For You</h2>
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Upcoming events from clubs you follow</p>
                                </div>
                                <button onClick={() => navigate('/calendar')} className="text-primary text-sm font-bold hover:underline">View All</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                                {!loadingEvents && forYouEvents.length === 0 && (
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm col-span-3 italic">Follow some clubs to see events here!</p>
                                )}
                                {forYouEvents
                                    .filter(e => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .slice(0, 3).map(e => <EventCard key={e.id} event={e} />)}
                            </div>
                        </div>

                        {/* Discover */}
                        <div className="mt-10 mb-8">
                            <div className="flex items-center justify-between px-4 pb-4">
                                <div>
                                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold">Random & Discover</h2>
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Explore events from clubs you haven't joined yet</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                                {!loadingEvents && discoverEvents.length === 0 && (
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm col-span-2 italic">No events to discover right now.</p>
                                )}
                                {discoverEvents
                                    .filter(e => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .slice(0, 4).map(e => <DiscoverItem key={e.id} event={e} />)}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
