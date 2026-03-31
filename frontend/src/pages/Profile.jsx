import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API = '';

const Profile = () => {
  const { user, loading, logout, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ batch: '', department: '', joined_clubs: [] });
  const [clubs, setClubs] = useState([]);
  const [saving, setSaving] = useState(false);

  const isIncomplete = user && (!user.batch || !user.department);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user) {
      setFormData({
        batch: user.batch || '',
        department: user.department || '',
        joined_clubs: user.joined_clubs || []
      });
      fetch(`${API}/api/clubs/`).then(r => r.json()).then(setClubs).catch(() => {});
    }
  }, [user, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
      } else { alert('Failed to save profile.'); }
    } catch { alert('An error occurred.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-white">
      <div className="animate-pulse">Loading profile...</div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex items-center justify-center p-4">
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
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a2632] object-cover shadow-lg" />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a2632] bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary bg-white dark:bg-[#111a22] shadow-lg">
                {(user.name || 'S').charAt(0).toUpperCase()}
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Full Name</label>
                <input type="text" value={user.name || ''} disabled className="w-full px-4 py-2 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-[#637588] dark:text-[#92adc9] opacity-70 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Email</label>
                <input type="text" value={user.email || ''} disabled className="w-full px-4 py-2 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-[#637588] dark:text-[#92adc9] opacity-70 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Batch / Year <span className="text-red-500">*</span></label>
                <input type="text" name="batch" value={formData.batch} onChange={handleChange} required placeholder="e.g. 2024" className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Department <span className="text-red-500">*</span></label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g. CSE" className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#111418] dark:text-white">Joined Clubs</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.joined_clubs.map(club => (
                  <span key={club} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                    {club}
                    <button type="button" onClick={() => setFormData(p => ({ ...p, joined_clubs: p.joined_clubs.filter(c => c !== club) }))} className="ml-2 hover:text-red-500">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
                {formData.joined_clubs.length === 0 && <span className="text-sm text-[#637588] dark:text-[#92adc9] italic">No clubs joined yet</span>}
              </div>
              <select onChange={(e) => { if (e.target.value && !formData.joined_clubs.includes(e.target.value)) setFormData(p => ({ ...p, joined_clubs: [...p.joined_clubs, e.target.value] })); e.target.value = ''; }}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:outline-none appearance-none">
                <option value="">Select a club to join...</option>
                {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
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
