import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

const API = '';

const PREDEFINED_INTERESTS = [
  'AI',
  'Machine Learning',
  'Robotics',
  'Web Development',
  'App Development',
  'Cybersecurity',
  'Cloud',
  'Entrepreneurship',
  'Design',
  'Photography',
  'Music',
  'Dance',
  'Sports',
  'Film',
  'Public Speaking',
];

const Profile = () => {
  const { user, loading, logout, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ register_number: '', batch: '', department: '', joined_clubs: [], interests: [] });
  const [clubs, setClubs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pictureError, setPictureError] = useState(false);
  const [clubSearch, setClubSearch] = useState('');
  const [clubSearchOpen, setClubSearchOpen] = useState(false);
  const [interestInput, setInterestInput] = useState('');
  const [saveError, setSaveError] = useState('');

  const isIncomplete = user && (!user.batch || !user.department || !user.register_number || (user.interests || []).length < 3);

  // Check if the user has a valid picture URL
  const hasValidPicture = user?.picture && user.picture.trim() !== '' && !pictureError;

  // Get the user's initial letter for the avatar fallback
  const getInitial = () => {
    return (user?.name || 'S').charAt(0).toUpperCase();
  };

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user) {
      setFormData({
        register_number: user.register_number || '',
        batch: user.batch || '',
        department: user.department || '',
        joined_clubs: user.joined_clubs || [],
        interests: user.interests || []
      });
      fetch(`${API}/api/clubs/`).then(r => r.json()).then(setClubs).catch(() => {});
    }
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddClub = (clubName) => {
    if (clubName && !formData.joined_clubs.includes(clubName)) {
      setFormData(p => ({ ...p, joined_clubs: [...p.joined_clubs, clubName] }));
    }
    setClubSearch('');
    setClubSearchOpen(false);
  };

  const handleRemoveClub = (clubName) => {
    setFormData(p => ({ ...p, joined_clubs: p.joined_clubs.filter(c => c !== clubName) }));
  };

  const addInterest = (rawInterest) => {
    const normalized = String(rawInterest || '').trim();
    if (!normalized) return;

    const exists = formData.interests.some(
      (interest) => String(interest).toLowerCase() === normalized.toLowerCase()
    );
    if (exists) return;

    setFormData((prev) => ({
      ...prev,
      interests: [...prev.interests, normalized],
    }));
  };

  const handleAddCustomInterest = () => {
    addInterest(interestInput);
    setInterestInput('');
  };

  const handleRemoveInterest = (interestToRemove) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter(
        (interest) => String(interest).toLowerCase() !== String(interestToRemove).toLowerCase()
      ),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (formData.interests.length < 3) {
      setSaveError('Please select at least 3 interests.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await refetchUser();
        navigate('/dashboard');
      } else {
        setSaveError('Failed to save profile.');
      }
    } catch {
      setSaveError('An error occurred while saving your profile.');
    }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-background-light dark:bg-background-dark text-white">
      <div className="animate-pulse">Loading profile...</div>
    </div>
  );

  if (!user) return null;

  // Available clubs = all clubs minus already joined ones
  const availableClubs = clubs.filter(c => !formData.joined_clubs.includes(c.name));
  const normalizedClubSearch = clubSearch.trim().toLowerCase();
  const matchedClubs = availableClubs
    .filter((club) => {
      if (!normalizedClubSearch) return true;
      return String(club.name || '').toLowerCase().includes(normalizedClubSearch);
    })
    .slice(0, 8);

  // Initial letter avatar component
  const InitialAvatar = ({ size = 'lg' }) => {
    const sizeClasses = size === 'lg'
      ? 'w-32 h-32 text-5xl'
      : 'w-10 h-10 text-lg';
    return (
      <div className={`${sizeClasses} rounded-full border-4 border-white dark:border-[#1a2632] flex items-center justify-center font-bold shadow-lg`}
        style={{
          background: 'linear-gradient(135deg, #137fec 0%, #0d5bab 100%)',
          color: 'white',
        }}
      >
        {getInitial()}
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="bg-primary h-32 relative">
          <div className="absolute top-4 left-4">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-white/80 hover:text-white transition-colors bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm text-sm font-medium">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Dashboard
            </button>
          </div>
          <div className="absolute top-4 right-4">
            <button onClick={logout} className="flex items-center gap-1 text-white/80 hover:text-white transition-colors bg-red-500/30 px-3 py-1 rounded-full backdrop-blur-sm text-sm font-medium">
              <span className="material-symbols-outlined text-[18px]">logout</span> Logout
            </button>
          </div>
          <div className="absolute -bottom-16 left-8">
            {hasValidPicture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a2632] object-cover shadow-lg"
                onError={() => setPictureError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <InitialAvatar size="lg" />
            )}
          </div>
        </div>

        <div className="pt-20 px-8 pb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#111418] dark:text-white mb-1">{isIncomplete ? 'Complete Your Profile' : 'Edit Profile'}</h1>
              <p className="text-[#637588] dark:text-[#92adc9]">{user.email}</p>
            </div>
            {!isIncomplete && <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{user.role}</span>}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {saveError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{saveError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Full Name</label>
                <input type="text" value={user.name || ''} disabled className="w-full px-4 py-2 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-[#637588] dark:text-[#92adc9] opacity-70 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Email</label>
                <input type="text" value={user.email || ''} disabled className="w-full px-4 py-2 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-[#637588] dark:text-[#92adc9] opacity-70 cursor-not-allowed" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Register Number <span className="text-red-500">*</span></label>
                <input type="text" name="register_number" value={formData.register_number} onChange={handleChange} required placeholder="e.g. 3122XXXXXXXX" className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Passout Year <span className="text-red-500">*</span></label>
                <input type="text" name="batch" value={formData.batch} onChange={handleChange} required placeholder="e.g. 2024" className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Department <span className="text-red-500">*</span></label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g. CSE" className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" />
              </div>
            </div>

            {/* Joined Clubs Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#111418] dark:text-white">Joined Clubs</label>

              {/* Club chips */}
              <div className="flex flex-wrap gap-2 min-h-9">
                {formData.joined_clubs.map(clubName => (
                  <span
                    key={clubName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors"
                    style={{
                      backgroundColor: 'rgba(19, 127, 236, 0.12)',
                      color: '#137fec',
                      borderColor: 'rgba(19, 127, 236, 0.25)',
                    }}
                  >
                    <span>{String(clubName)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveClub(clubName)}
                      className="flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors p-0.5"
                      aria-label={`Remove ${clubName}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
                {formData.joined_clubs.length === 0 && (
                  <span className="text-sm text-[#637588] dark:text-[#92adc9] italic py-1.5">No clubs joined yet</span>
                )}
              </div>

              {/* Typeahead for adding clubs */}
              <div className="relative">
                <input
                  type="text"
                  value={clubSearch}
                  onChange={(e) => {
                    setClubSearch(e.target.value);
                    setClubSearchOpen(true);
                  }}
                  onFocus={() => setClubSearchOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setClubSearchOpen(false), 120);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && matchedClubs.length > 0) {
                      e.preventDefault();
                      handleAddClub(matchedClubs[0].name);
                    }
                  }}
                  placeholder="Type club name to join..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none"
                />

                {clubSearchOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] shadow-xl max-h-60 overflow-y-auto">
                    {availableClubs.length === 0 && (
                      <p className="px-4 py-3 text-sm text-[#637588] dark:text-[#92adc9] italic">All clubs have been joined</p>
                    )}

                    {availableClubs.length > 0 && matchedClubs.length === 0 && (
                      <p className="px-4 py-3 text-sm text-[#637588] dark:text-[#92adc9] italic">No matching clubs found</p>
                    )}

                    {matchedClubs.map((club) => (
                      <button
                        key={club.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddClub(club.name)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-primary/10 transition-colors text-[#111418] dark:text-white text-sm"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold text-xs">{club.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{club.name}</span>
                          <span className="text-xs text-[#637588] dark:text-[#92adc9]">{club.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Interests Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Interests <span className="text-red-500">*</span></label>
                <span className="text-xs text-[#637588] dark:text-[#92adc9]">Select at least 3</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {PREDEFINED_INTERESTS.map((interest) => {
                  const selected = formData.interests.some(
                    (item) => String(item).toLowerCase() === interest.toLowerCase()
                  );

                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => (selected ? handleRemoveInterest(interest) : addInterest(interest))}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${selected
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-white dark:bg-[#1a2632] text-[#111418] dark:text-white border-[#e5e7eb] dark:border-[#233648] hover:border-primary/40'
                        }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomInterest();
                    }
                  }}
                  placeholder="Add custom interest (e.g. blockchain)"
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomInterest}
                  className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-9">
                {formData.interests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
                    style={{
                      backgroundColor: 'rgba(19, 127, 236, 0.12)',
                      color: '#137fec',
                      borderColor: 'rgba(19, 127, 236, 0.25)',
                    }}
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors p-0.5"
                      aria-label={`Remove ${interest}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
                {formData.interests.length === 0 && (
                  <span className="text-sm text-[#637588] dark:text-[#92adc9] italic py-1.5">No interests selected yet</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-[#e5e7eb] dark:border-[#233648] mt-6">
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 active:scale-95 transform duration-100 disabled:opacity-50">
                {saving ? 'Saving...' : isIncomplete ? 'Complete Setup & Continue' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
