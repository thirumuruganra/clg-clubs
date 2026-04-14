import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import StudentSidebar from '../components/StudentSidebar';
import { warmPosterCacheForEvents } from '../lib/utils';

const API = '';

const eventMatchesSearch = (event, rawQuery) => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return true;

    return [event.title, event.description, event.keywords]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query));
};

const StudentDashboard = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [forYouEvents, setForYouEvents] = useState([]);
    const [discoverEvents, setDiscoverEvents] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [actionError, setActionError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const fetchEvents = useCallback(async () => {
        if (!user?.id) return;

        try {
            const recommendedRes = await fetch(`${API}/api/events/feed?type=recommended&user_id=${user.id}`);
            if (recommendedRes.ok) {
                const recommendedEvents = await recommendedRes.json();
                warmPosterCacheForEvents(recommendedEvents);
                setForYouEvents(recommendedEvents);
                setDiscoverEvents(recommendedEvents.filter((event) => !event.is_from_followed_club));
            }
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoadingEvents(false);
        }
    }, [user]);

    const fetchClubs = useCallback(async () => {
        if (!user?.id) return;

        try {
            const res = await fetch(`${API}/api/clubs/?user_id=${user.id}`);
            if (res.ok) setClubs(await res.json());
        } catch (err) { console.error('Error fetching clubs:', err); }
    }, [user]);

    const fetchActivities = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/rsvp/rsvps/me/activity`);
            if (res.ok) {
                setActivities(await res.json());
            }
        } catch (err) { console.error('Error fetching activities:', err); }
        finally { setLoadingActivities(false); }
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
            return;
        }
        if (
            user &&
            user.role !== 'CLUB_ADMIN' &&
            (!user.batch || !user.department || !user.degree || (user.interests || []).length < 3)
        ) {
            navigate('/student/profile');
            return;
        }
        if (user) {
            void fetchEvents();
            void fetchClubs();
            void fetchActivities();
        }
    }, [user, loading, navigate, fetchEvents, fetchClubs, fetchActivities]);

    const handleRSVP = async (eventId, isRegistered) => {
        setActionError('');
        try {
            const method = isRegistered ? 'DELETE' : 'POST';
            const res = await fetch(`${API}/api/rsvp/events/${eventId}/rsvp`, { method });
            if (res.ok) fetchEvents();
            else {
                const data = await res.json();
                setActionError(data.detail || (isRegistered ? 'Failed to unregister.' : 'Already registered for this event.'));
            }
        } catch (err) {
            console.error(err);
            setActionError('Unable to update registration right now.');
        }
    };


    if (loading) return (
        <div className="min-h-dvh flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="animate-pulse text-white text-lg">Loading...</div>
        </div>
    );

    const name = user?.name || 'Student';
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const formatDate = (iso) => {
        if (!iso) return { month: '', day: '' };
        const d = new Date(iso);
        return { month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(), day: d.getDate() };
    };

    const EventCard = ({ event }) => {
        const { month, day } = formatDate(event.start_time);
        return (
            <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] hover:shadow-lg transition-shadow">
                <div className="relative h-36 sm:h-40 bg-[#0f1720] overflow-hidden">
                    {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                    ) : null}
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
                    <p className="mb-2 text-sm text-[#637588] dark:text-[#92adc9] line-clamp-2">{event.description}</p>
                    
                    {event.keywords && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {event.keywords.split(",").map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-[#233648] text-[#637588] dark:text-[#92adc9] text-[10px] rounded-full border border-[#e5e7eb] dark:border-[#34485c]">{kw.trim()}</span>
                            ))}
                        </div>
                    )}
                    
                    {event.is_paid && (
                        <div className="mb-3 text-xs flex flex-col gap-1 bg-orange-50 dark:bg-orange-500/10 p-2 rounded-lg border border-orange-100 dark:border-orange-500/20">
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                <span>Registration Fee: {event.registration_fees || "TBA"}</span>
                            </div>
                            {event.payment_link && (
                                <a href={event.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={e => e.stopPropagation()}>
                                    <span className="material-symbols-outlined text-[14px]">link</span>
                                    <span>Payment Link</span>
                                </a>
                            )}
                        </div>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[#637588] dark:text-[#92adc9]">
                            <span className="material-symbols-outlined text-[16px]">group</span>
                            <span className="text-xs font-medium">{event.rsvp_count || 0} registered</span>
                        </div>
                        <button
                            onClick={() => handleRSVP(event.id, event.is_rsvped)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${event.is_rsvped ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                            {event.is_rsvped ? 'Unregister' : 'Register'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const DiscoverItem = ({ event }) => {
        const { month, day } = formatDate(event.start_time);
        return (
            <div className="flex flex-col sm:flex-row overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] min-h-40 hover:shadow-lg transition-shadow">
                <div className="w-full sm:w-1/3 h-32 sm:h-auto bg-[#0f1720] overflow-hidden">
                    {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                    ) : null}
                </div>
                <div className="flex w-full sm:w-2/3 flex-col p-4 justify-between gap-3">
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
                        <button onClick={() => navigate('/student/calendar')} className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] dark:border-[#233648] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                            More Info
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="relative flex h-auto min-h-dvh w-full bg-background-light dark:bg-background-dark font-display overflow-x-hidden text-slate-900 dark:text-white">
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
            )}
            <StudentSidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            <div className="layout-container flex h-full grow flex-col flex-1 min-w-0">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-solid border-[#e5e7eb] dark:border-[#233648] px-4 md:px-10 py-3 bg-white dark:bg-[#111a22]">
                    <div className="flex items-center gap-3 md:gap-8 min-w-0">
                        <button aria-label="Open sidebar" className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors" onClick={() => setMobileMenuOpen(true)}>
                            <span className="material-symbols-outlined text-[24px]">menu</span>
                        </button>
                        <div className="flex items-center gap-3 md:gap-4 text-[#111418] dark:text-white cursor-pointer min-w-0" onClick={() => navigate('/student/dashboard')}>
                            <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] truncate">WAVC</h2>
                        </div>
                        <label className="hidden md:flex flex-col min-w-40 h-10! max-w-64">
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
                    <div className="flex flex-1 justify-end gap-3 md:gap-8 min-w-0">
                        {user?.role === 'CLUB_ADMIN' && (
                            <button onClick={() => navigate('/club/dashboard')} className="hidden md:flex min-w-21 cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                                <span className="truncate">Create Event</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-6 md:py-8 overflow-x-hidden">
                    <div className="layout-content-container flex flex-col max-w-240 w-full min-w-0 flex-1">
                        <div className="md:hidden px-4 pb-2 pt-4">
                            <label className="flex flex-col h-10">
                                <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                                    <div className="text-[#637588] dark:text-[#92adc9] flex border-none bg-[#f0f2f4] dark:bg-[#233648] items-center justify-center pl-3 rounded-l-xl">
                                        <span className="material-symbols-outlined text-[20px]">search</span>
                                    </div>
                                    <input
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border-none bg-[#f0f2f4] dark:bg-[#233648] h-full placeholder:text-[#637588] dark:placeholder:text-[#92adc9] px-3 rounded-l-none pl-2 text-sm font-normal"
                                        placeholder="Search events"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </label>
                        </div>
                        {/* Welcome */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end pb-3 pt-6 px-4 min-w-0">
                            <div className="min-w-0">
                                <h1 className="text-[#111418] dark:text-white text-3xl sm:text-[32px] font-bold leading-tight wrap-break-word">Welcome back, {name}!</h1>
                                <p className="text-[#637588] dark:text-[#92adc9] text-base mt-2">Here's what's happening around campus today.</p>
                            </div>
                            <div className="text-[#637588] dark:text-[#92adc9] text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                                <span>{currentDate}</span>
                            </div>
                        </div>
                        {actionError && <p className="mx-4 mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{actionError}</p>}

                        {/* Calendar Tile */}
                        <div className="grid grid-cols-1 gap-4 p-4">
                            <div onClick={() => navigate('/student/calendar')} className="group relative cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md h-64 sm:h-72 md:h-80">
                                <div className="absolute inset-0 bg-linear-to-t from-black/70 to-black/20 transition-transform duration-500 group-hover:scale-105 bg-cover bg-center"
                                    style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuB3zrC2zWTw2D4ivcIDWAb6vufiRs4bu3TgruhnB8zNBUeKci7kXQow7VafPKRga4Lua80PMNk1-QDne8Jz2xL8sVt3D4vk8aly08_J7ECW6ibdVKe9cK___pbaTzgl6Ao0GGmlrhdkYYcHHKC28MFxi-5Mx_ilnkcmxWj5IIVBLlLxQYWXwPOekKPJDW0-W2SFeW-zf9V-A-3yzcHNOiIBjXVzDYVZKSGxx5ZgP8Wqr1aIRU71sDUnwUvmUITWOzvvnhPYUWOcoek")' }}
                                ></div>
                                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                                    <div className="mb-4"><span className="material-symbols-outlined rounded-full bg-white/20 p-3 text-white backdrop-blur-sm text-2xl">calendar_month</span></div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Event Calendar</h3>
                                    <p className="text-base text-gray-200 line-clamp-2 max-w-2xl">Check out all scheduled activities and plan your semester ahead.</p>
                                </div>
                            </div>
                        </div>

                        {/* For You */}
                        <div className="mt-8">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                                <div>
                                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold">For You</h2>
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Interest-matched events ranked for you across all clubs</p>
                                </div>
                                <button onClick={() => navigate('/student/calendar')} className="text-primary text-sm font-bold hover:underline">View All</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                                {!loadingEvents && forYouEvents.length === 0 && (
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm col-span-3 italic">No personalized events yet. Add more interests in your profile.</p>
                                )}
                                {forYouEvents
                                    .filter(e => eventMatchesSearch(e, searchQuery))
                                    .slice(0, 3).map(e => <EventCard key={e.id} event={e} />)}
                            </div>
                        </div>

                        {/* Discover */}
                        <div className="mt-10 mb-8">
                            <div className="flex items-center justify-between px-4 pb-4">
                                <div>
                                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold">Explore Beyond Your Clubs</h2>
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Great matches from clubs you do not follow yet</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                                {!loadingEvents && discoverEvents.length === 0 && (
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm col-span-2 italic">No extra recommendations right now.</p>
                                )}
                                {discoverEvents
                                    .filter(e => eventMatchesSearch(e, searchQuery))
                                    .slice(0, 4).map(e => <DiscoverItem key={e.id} event={e} />)}
                            </div>
                        </div>

                        {/* Clubs CTA */}
                        <div className="mt-10">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                                <div>
                                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold">Clubs</h2>
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Follow clubs for stronger priority in your personalized feed</p>
                                </div>
                                <button onClick={() => navigate('/student/clubs')} className="text-primary text-sm font-bold hover:underline">View All</button>
                            </div>
                            <div className="px-4">
                                <div onClick={() => navigate('/student/clubs')} className="group cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] p-5 sm:p-6 hover:shadow-lg hover:border-primary/30 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <span className="material-symbols-outlined text-primary text-[32px]">groups</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-[#111418] dark:text-white group-hover:text-primary transition-colors">Explore All Clubs</h3>
                                        <p className="text-sm text-[#637588] dark:text-[#92adc9] mt-1">{clubs.length} clubs available &middot; {clubs.filter(c => c.is_following).length} following</p>
                                    </div>
                                    <span className="material-symbols-outlined text-[24px] text-[#637588] dark:text-[#92adc9] group-hover:text-primary group-hover:translate-x-1 transition-all self-end sm:self-center">arrow_forward</span>
                                </div>
                            </div>
                        </div>

                        {/* Student Activity Tracker */}
                        <div className="mt-10 mb-8">
                            <div className="flex items-center justify-between px-4 pb-4">
                                <div>
                                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold">Student Activity Tracker</h2>
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Events you have attended</p>
                                </div>
                            </div>
                            <div className="px-4">
                                {loadingActivities ? (
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm italic">Loading activities...</p>
                                ) : activities.length === 0 ? (
                                    <p className="text-[#637588] dark:text-[#92adc9] text-sm italic">No attended events yet. Participate in events to earn activity points!</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#1a2632]">
                                        <table className="w-full min-w-160 text-left text-sm text-[#111418] dark:text-white">
                                            <thead className="bg-[#f0f2f4] dark:bg-[#233648] text-xs uppercase text-[#637588] dark:text-[#92adc9]">
                                                <tr>
                                                    <th className="px-3 md:px-6 py-3 whitespace-nowrap">Event Name</th>
                                                    <th className="px-3 md:px-6 py-3 whitespace-nowrap">Club Name</th>
                                                    <th className="px-3 md:px-6 py-3 whitespace-nowrap">Date</th>
                                                    <th className="px-3 md:px-6 py-3 whitespace-nowrap">Start Time</th>
                                                    <th className="px-3 md:px-6 py-3 whitespace-nowrap">End Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y border-t border-[#e5e7eb] dark:border-[#233648] divide-[#e5e7eb] dark:divide-[#233648]">
                                                {activities.map((act, i) => {
                                                    const startD = new Date(act.start_time);
                                                    const endD = new Date(act.end_time);
                                                    const dateStr = startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                    const startTimeStr = startD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                                    const endTimeStr = endD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                                    return (
                                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#111a22] transition-colors">
                                                            <td className="px-3 md:px-6 py-4 font-medium">{act.event_name}</td>
                                                            <td className="px-3 md:px-6 py-4">{act.club_name}</td>
                                                            <td className="px-3 md:px-6 py-4">{dateStr}</td>
                                                            <td className="px-3 md:px-6 py-4">{startTimeStr}</td>
                                                            <td className="px-3 md:px-6 py-4">{endTimeStr}</td>
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
                </main>
            </div>
        </div>
    );
};

export default StudentDashboard;
