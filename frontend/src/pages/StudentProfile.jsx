import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getClubIconUrl, getClubInitial } from '../lib/utils';
import wavcIcon from '../assets/WAVC-edit.png';
import { Button } from '../components/ui/button';
import { FieldMessage } from '../components/ui/field-message';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SearchBar } from '../components/ui/search-bar';
import { Select } from '../components/ui/select';

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

const COURSE_OPTIONS = [
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Artificial Intelligence and Data Science',
  'Computer Science and Engineering',
  'Computer Science and Engineering (Internet of Things)',
  'Computer Science and Engineering (Cyber Security)',
  'Electrical and Electronics Engineering',
  'ECE',
  'ECE (VLSI Design and Technology)',
  'IT',
  'Mechanical Engineering',
];

const DEGREE_OPTIONS = [
  'B.E.',
  'B.Tech',
  'M.E.',
  'M.Tech Integrated',
  'M.Tech',
];

const REGISTER_NUMBER_PATTERN = /^3122\d{9}$/;
const PASSOUT_YEAR_PATTERN = /^\d{4}$/;
const PASSOUT_YEAR_MAX_AHEAD = 6;

const StudentProfile = () => {
  const { user, loading, logout, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ register_number: '', batch: '', department: '', degree: '', joined_clubs: [], interests: [] });
  const [clubs, setClubs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pictureError, setPictureError] = useState(false);
  const [clubSearch, setClubSearch] = useState('');
  const [clubSearchOpen, setClubSearchOpen] = useState(false);
  const [interestInput, setInterestInput] = useState('');
  const [saveError, setSaveError] = useState('');
  const currentYear = new Date().getFullYear();
  const minPassoutYear = currentYear;
  const maxPassoutYear = currentYear + PASSOUT_YEAR_MAX_AHEAD;

  const isIncomplete = user && (!user.batch || !user.department || !user.degree || !user.register_number || (user.interests || []).length < 3);

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
        degree: user.degree || '',
        joined_clubs: user.joined_clubs || [],
        interests: user.interests || []
      });
      fetch(`${API}/api/clubs/`).then(r => r.json()).then(setClubs).catch(() => {});
    }
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'register_number') {
      const digitsOnly = String(value || '').replace(/\D/g, '').slice(0, 13);
      setFormData((prev) => ({ ...prev, register_number: digitsOnly }));
      return;
    }

    if (name === 'batch') {
      const digitsOnly = String(value || '').replace(/\D/g, '').slice(0, 4);
      setFormData((prev) => ({ ...prev, batch: digitsOnly }));
      return;
    }

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

    const registerNumber = String(formData.register_number || '').trim();
    if (!REGISTER_NUMBER_PATTERN.test(registerNumber)) {
      setSaveError('Register number must be exactly 13 digits and start with 3122.');
      return;
    }

    const passoutYear = String(formData.batch || '').trim();
    if (!PASSOUT_YEAR_PATTERN.test(passoutYear)) {
      setSaveError('Passout year must be a 4-digit year (e.g. 2027).');
      return;
    }

    const passoutYearValue = Number(passoutYear);
    if (passoutYearValue < minPassoutYear || passoutYearValue > maxPassoutYear) {
      setSaveError(`Passout year must be between ${minPassoutYear} and ${maxPassoutYear}.`);
      return;
    }

    if (formData.interests.length < 3) {
      setSaveError('Please select at least 3 interests.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          register_number: registerNumber,
          batch: passoutYear,
        })
      });
      if (res.ok) {
        await refetchUser();
        navigate('/student/dashboard');
      } else {
        const errorPayload = await res.json().catch(() => null);
        const errorDetail = errorPayload?.detail;

        if (typeof errorDetail === 'string' && errorDetail.trim()) {
          setSaveError(errorDetail);
        } else if (Array.isArray(errorDetail) && errorDetail.length > 0) {
          const firstMessage = errorDetail[0]?.msg;
          setSaveError(typeof firstMessage === 'string' ? firstMessage : 'Failed to save profile.');
        } else {
          setSaveError('Failed to save profile.');
        }
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

  return (
    <div className="min-h-dvh bg-background-light font-body text-slate-900 dark:bg-background-dark dark:text-white">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border-subtle dark:border-border-strong bg-white dark:bg-[#111a22]">
        <div className="flex items-center gap-3">
          <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          <span className="text-lg font-bold">WAVC</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="touch-target px-3 sm:px-4 py-2 rounded-xl border border-border-subtle dark:border-border-strong text-xs sm:text-sm font-medium hover:bg-surface-muted dark:hover:bg-border-strong transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            onClick={logout}
            className="touch-target px-3 sm:px-4 py-2 rounded-xl border border-border-subtle dark:border-border-strong text-xs sm:text-sm font-medium hover:bg-surface-muted dark:hover:bg-border-strong transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="type-page-title mb-2 sm:text-4xl">{isIncomplete ? 'Set up your student profile' : 'Edit your student profile'}</h1>
        <p className="type-lead mb-10 text-text-secondary dark:text-text-dark-secondary">
          Keep your details up to date for better recommendations, easier registrations, and relevant club activity.
        </p>

        <form onSubmit={handleSave} className="space-y-8">
            {saveError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <FieldMessage tone="error">{saveError}</FieldMessage>
              </div>
            ) : null}

            <div className="border border-dashed border-border-subtle dark:border-border-strong rounded-xl p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-text-secondary/30 flex items-center justify-center shrink-0 bg-surface-muted dark:bg-border-strong overflow-hidden">
                {hasValidPicture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                    onError={() => setPictureError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-4xl font-bold text-text-secondary">{getInitial()}</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">Student Profile Picture</h3>
                <p className="type-body text-text-secondary dark:text-text-dark-secondary">
                  Your Google profile picture is used automatically. It updates when your Google account photo changes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-1">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input id="profile-name" type="text" value={user.name || ''} disabled className="opacity-70" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="text" value={user.email || ''} disabled className="opacity-70" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="profile-register-number" required>Register Number</Label>
                <Input
                  id="profile-register-number"
                  type="text"
                  name="register_number"
                  value={formData.register_number}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  inputMode="numeric"
                  pattern="3122\d{9}"
                  maxLength={13}
                  placeholder="e.g. 3122012345678"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-batch" required>Passout Year</Label>
                <Input
                  id="profile-batch"
                  type="text"
                  name="batch"
                  value={formData.batch}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  min={String(minPassoutYear)}
                  max={String(maxPassoutYear)}
                  placeholder="e.g. 2027"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-department" required>Course</Label>
                <Select id="profile-department" name="department" value={formData.department} onChange={handleChange} required aria-required="true">
                  <option value="" disabled>Select your course</option>
                  {COURSE_OPTIONS.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-degree" required>Degree</Label>
                <Select id="profile-degree" name="degree" value={formData.degree} onChange={handleChange} required aria-required="true">
                  <option value="" disabled>Select your degree</option>
                  {DEGREE_OPTIONS.map((degree) => (
                    <option key={degree} value={degree}>{degree}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Clubs you're a part of section */}
            <div className="space-y-2">
              <Label htmlFor="profile-club-search">Clubs you&apos;re a part of</Label>

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
                      <span className="material-symbols-outlined text-secondary">close</span>
                    </button>
                  </span>
                ))}
                {formData.joined_clubs.length === 0 && (
                  <span className="text-sm text-text-secondary dark:text-text-dark-secondary italic py-1.5">No clubs yet</span>
                )}
              </div>

              {/* Typeahead for adding clubs */}
              <div className="relative">
                <SearchBar
                  id="profile-club-search"
                  type="text"
                  ariaLabel="Search clubs to join"
                  ariaAutocomplete="list"
                  ariaExpanded={clubSearchOpen}
                  value={clubSearch}
                  onChange={(value) => {
                    setClubSearch(value);
                    setClubSearchOpen(true);
                  }}
                  onFocus={() => setClubSearchOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setClubSearchOpen(false), 120);
                  }}
                  className="h-10 rounded-xl"
                  inputClassName="px-2"
                  iconClassName="bg-transparent p-0 text-[18px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && matchedClubs.length > 0) {
                      e.preventDefault();
                      handleAddClub(matchedClubs[0].name);
                    }
                  }}
                  placeholder="Type club name to join..."
                />

                {clubSearchOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-[#1a2632] border border-border-subtle dark:border-border-strong shadow-xl max-h-60 overflow-y-auto">
                    {availableClubs.length === 0 && (
                      <p className="px-4 py-3 text-sm text-text-secondary dark:text-text-dark-secondary italic">All clubs have been joined</p>
                    )}

                    {availableClubs.length > 0 && matchedClubs.length === 0 && (
                      <p className="px-4 py-3 text-sm text-text-secondary dark:text-text-dark-secondary italic">No matching clubs found</p>
                    )}

                    {matchedClubs.map((club) => {
                      const clubIconUrl = getClubIconUrl(club);

                      return (
                      <button
                        key={club.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddClub(club.name)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-primary/10 transition-colors text-text-primary dark:text-white text-sm"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {clubIconUrl ? (
                            <img src={clubIconUrl} alt={club.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-primary font-bold text-xs">{getClubInitial(club)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{club.name}</span>
                          <span className="text-xs text-text-secondary dark:text-text-dark-secondary">{club.category}</span>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Interests Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-interest-input" required>Interests</Label>
                <span className="text-xs text-text-secondary dark:text-text-dark-secondary">Select at least 3</span>
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
                      aria-pressed={selected}
                      onClick={() => (selected ? handleRemoveInterest(interest) : addInterest(interest))}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${selected
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-white dark:bg-[#1a2632] text-text-primary dark:text-white border-border-subtle dark:border-border-strong hover:border-primary/40'
                        }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="profile-interest-input"
                  type="text"
                  aria-label="Add custom interest"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomInterest();
                    }
                  }}
                  placeholder="Add custom interest (e.g. blockchain)"
                />
                <Button
                  type="button"
                  onClick={handleAddCustomInterest}
                  variant="secondary"
                  className="border border-border-subtle"
                >
                  Add
                </Button>
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
                      <span className="material-symbols-outlined text-secondary">close</span>
                    </button>
                  </span>
                ))}
                {formData.interests.length === 0 && (
                  <span className="text-sm text-text-secondary dark:text-text-dark-secondary italic py-1.5">No interests selected yet</span>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6 pt-6 border-t border-border-subtle dark:border-border-strong mt-6">
              <Button type="button" variant="ghost" onClick={() => navigate('/student/dashboard')} className="text-sm font-bold text-text-secondary">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="px-8 text-sm font-bold">
                {saving ? 'Saving...' : isIncomplete ? 'Complete Setup & Continue' : 'Save Changes'}
                {!saving && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
              </Button>
            </div>
          </form>
        </div>
    </div>
  );
};

export default StudentProfile;
