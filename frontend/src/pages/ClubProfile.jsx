import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import wavcIcon from '../assets/WAVC-edit.png';

const API = '';
const CLUB_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ClubProfile = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    instagram_handle: '',
    category: 'TECH',
    logo_url: '',
  });
  const [loadingClub, setLoadingClub] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const uploadClubLogo = async (clubId, selectedFile) => {
    const data = new FormData();
    data.append('file', selectedFile, selectedFile.name || 'club-logo');

    const res = await fetch(`${API}/api/clubs/${clubId}/logo`, {
      method: 'POST',
      body: data,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.detail || 'Logo upload failed.');
    }

    return res.json();
  };

  const onSelectLogoFile = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setLogoFile(null);
      setLogoPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return '';
      });
      return;
    }

    if (!ALLOWED_LOGO_TYPES.includes(selectedFile.type)) {
      setFormError('Logo must be JPEG, PNG, or WebP.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > CLUB_LOGO_MAX_SIZE_BYTES) {
      setFormError('Logo must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    setFormError('');
    setLogoFile(selectedFile);
    setLogoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(selectedFile);
    });
  };

  const fetchClub = useCallback(async () => {
    if (!user?.id) return;

    setLoadingClub(true);
    try {
      const res = await fetch(`${API}/api/clubs/`);
      if (!res.ok) {
        setFormError('Unable to load club profile right now.');
        return;
      }

      const clubs = await res.json();
      const myClub = clubs.find((item) => item.admin_id === user.id);

      if (!myClub) {
        navigate('/club/setup');
        return;
      }

      setClub(myClub);
      setFormData({
        name: myClub.name || '',
        instagram_handle: myClub.instagram_handle || '',
        category: myClub.category || 'TECH',
        logo_url: myClub.logo_url || '',
      });
    } catch (error) {
      console.error(error);
      setFormError('Unable to load club profile right now.');
    } finally {
      setLoadingClub(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user && user.role !== 'CLUB_ADMIN') {
      navigate('/student/dashboard');
      return;
    }

    if (user) {
      void fetchClub();
    }
  }, [fetchClub, loading, navigate, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!club) return;

    setFormError('');
    setSuccessMessage('');

    if (!formData.name.trim()) {
      setFormError('Club name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        instagram_handle: formData.instagram_handle.trim(),
        category: formData.category,
        logo_url: formData.logo_url.trim(),
      };

      const res = await fetch(`${API}/api/clubs/${club.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.detail || 'Failed to update club profile.');
        return;
      }

      let updatedClub = await res.json();

      if (logoFile) {
        const uploadPayload = await uploadClubLogo(updatedClub.id, logoFile);
        if (uploadPayload?.club) {
          updatedClub = uploadPayload.club;
        }
      }

      setClub(updatedClub);
      setFormData((previous) => ({
        ...previous,
        name: updatedClub.name || previous.name,
        instagram_handle: updatedClub.instagram_handle || '',
        category: updatedClub.category || previous.category,
        logo_url: updatedClub.logo_url || '',
      }));
      setLogoFile(null);
      setLogoPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return '';
      });
      setSuccessMessage('Club profile updated successfully.');
    } catch (error) {
      console.error(error);
      setFormError('Failed to update club profile.');
    } finally {
      setSaving(false);
    }
  };

  const resolvedPreviewImage = logoPreview || formData.logo_url.trim() || user?.picture || '';

  if (loading || loadingClub) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-dark text-white">
        <div className="animate-pulse text-lg">Loading club profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">
        <div className="flex items-center gap-3">
          <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          <span className="text-lg font-bold">WAVC</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/club/dashboard')}
            className="touch-target px-3 sm:px-4 py-2 rounded-xl border border-[#e5e7eb] dark:border-[#233648] text-xs sm:text-sm font-medium hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            onClick={logout}
            className="touch-target px-3 sm:px-4 py-2 rounded-xl border border-[#e5e7eb] dark:border-[#233648] text-xs sm:text-sm font-medium hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Club Profile</h1>
        <p className="text-[#637588] dark:text-[#92adc9] mb-10 text-lg">
          Update club details shown to students across clubs, calendar, and profile suggestions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {formError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{formError}</p>}
          {successMessage && <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">{successMessage}</p>}

          <div className="border border-dashed border-[#e5e7eb] dark:border-[#233648] rounded-xl p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#637588]/30 flex items-center justify-center shrink-0 bg-[#f0f2f4] dark:bg-[#233648] overflow-hidden">
              {resolvedPreviewImage ? (
                <img src={resolvedPreviewImage} alt="Club profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="material-symbols-outlined text-[40px] text-[#637588]/50">photo_camera</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">Club Profile Picture</h3>
              <p className="text-sm text-[#637588] dark:text-[#92adc9] mb-3">
                If no custom image is set, your Google profile picture will be used automatically.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="touch-target inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] dark:border-[#233648] px-4 py-2 text-sm font-medium cursor-pointer hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Select File
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onSelectLogoFile}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview((previous) => {
                      if (previous) URL.revokeObjectURL(previous);
                      return '';
                    });
                    setFormData((previous) => ({ ...previous, logo_url: '' }));
                  }}
                  className="touch-target rounded-lg border border-[#e5e7eb] dark:border-[#233648] px-4 py-2 text-sm font-medium hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
                >
                  Use Google Picture
                </button>
                <span className="text-xs text-[#637588] dark:text-[#92adc9] truncate max-w-64">{logoFile ? logoFile.name : 'No new file selected'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Club Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="e.g. WAVC Robotics Club"
              className="w-full px-4 py-3 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-base focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Instagram Handle</label>
            <div className="flex items-center px-4 py-3 rounded-xl bg-[#f0f2f4] dark:bg-[#233648]">
              <span className="text-[#637588] text-base mr-1">@</span>
              <input
                type="text"
                value={formData.instagram_handle}
                onChange={(event) => setFormData((previous) => ({ ...previous, instagram_handle: event.target.value }))}
                placeholder="wavc_robotics"
                className="bg-transparent border-none text-base focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-3">Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: 'TECH', label: 'Tech Club', desc: 'Coding, engineering, data science, and hardware projects.' },
                { value: 'NON_TECH', label: 'Non-Tech Club', desc: 'Arts, culture, sports, debate, and social initiatives.' },
              ].map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFormData((previous) => ({ ...previous, category: category.value }))}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    formData.category === category.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-[#e5e7eb] dark:border-[#233648] hover:border-[#637588]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.category === category.value ? 'border-primary' : 'border-[#637588]'}`}>
                      {formData.category === category.value && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                    </div>
                    <span className="font-bold">{category.label}</span>
                  </div>
                  <p className="text-sm text-[#637588] dark:text-[#92adc9] ml-8">{category.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/club/dashboard')}
              className="touch-target px-6 py-3 rounded-xl border border-[#e5e7eb] dark:border-[#233648] text-sm font-bold hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="touch-target px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubProfile;
