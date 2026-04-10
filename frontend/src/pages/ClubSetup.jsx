import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import wavcIcon from '../assets/WAVC-edit.png';

const API = '';

const ClubSetup = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    instagram_handle: '',
    category: 'TECH',
    logo_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-background-dark text-white">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>
  );

  if (!user || user.role !== 'CLUB_ADMIN') {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('Please enter a club name.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/clubs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        navigate('/admin');
      } else {
        const data = await res.json();
        setFormError(data.detail || 'Failed to create club.');
      }
    } catch {
      setFormError('Error creating club.');
    }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">
        <div className="flex items-center gap-3">
          <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          <span className="text-lg font-bold">WAVC</span>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl border border-[#e5e7eb] dark:border-[#233648] text-sm font-medium hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Set up your club profile</h1>
        <p className="text-[#637588] dark:text-[#92adc9] mb-10 text-lg">
          Tell us a bit about your club to get started. This information will be visible to all students.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {formError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{formError}</p>}
          {/* Logo Upload Area */}
          <div className="border border-dashed border-[#e5e7eb] dark:border-[#233648] rounded-xl p-8 flex items-center gap-8">
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#637588]/30 flex items-center justify-center shrink-0 bg-[#f0f2f4] dark:bg-[#233648]">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[40px] text-[#637588]/50">photo_camera</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">Upload Club Logo</h3>
              <p className="text-sm text-[#637588] dark:text-[#92adc9] mb-3">Recommended size: 400×400px. JPG, PNG supported.</p>
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={e => setFormData(p => ({ ...p, logo_url: e.target.value }))}
                  placeholder="Paste logo URL..."
                  className="flex-1 px-4 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]"
                />
                <span className="text-primary text-sm font-medium flex items-center gap-1 cursor-pointer hover:underline">
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Select File
                </span>
              </div>
            </div>
          </div>

          {/* Club Name */}
          <div>
            <label className="block text-sm font-bold mb-2">Club Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. WAVC Robotics Club"
              className="w-full px-4 py-3 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-base focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]"
            />
          </div>

          {/* Instagram Handle */}
          <div>
            <label className="block text-sm font-bold mb-2">Instagram Handle</label>
            <div className="flex items-center px-4 py-3 rounded-xl bg-[#f0f2f4] dark:bg-[#233648]">
              <span className="text-[#637588] text-base mr-1">@</span>
              <input
                type="text"
                value={formData.instagram_handle}
                onChange={e => setFormData(p => ({ ...p, instagram_handle: e.target.value }))}
                placeholder="wavc_robotics"
                className="bg-transparent border-none text-base focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold mb-3">Category</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'TECH', label: 'Tech Club', desc: 'Focuses on coding, engineering, data science, and hardware projects.', icon: 'computer' },
                { value: 'NON_TECH', label: 'Non-Tech Club', desc: 'Focuses on arts, culture, sports, debate, social causes, or networking.', icon: 'palette' },
              ].map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, category: cat.value }))}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    formData.category === cat.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-[#e5e7eb] dark:border-[#233648] hover:border-[#637588]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.category === cat.value ? 'border-primary' : 'border-[#637588]'}`}>
                      {formData.category === cat.value && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                    </div>
                    <span className="font-bold">{cat.label}</span>
                  </div>
                  <p className="text-sm text-[#637588] dark:text-[#92adc9] ml-8">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-6 pt-6">
            <button type="button" onClick={() => navigate('/dashboard')} className="text-sm font-bold text-[#637588] dark:text-[#92adc9] hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Setting up...' : 'Complete Setup'}
              {!saving && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubSetup;
