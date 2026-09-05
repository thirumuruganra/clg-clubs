import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import wavcIcon from '../assets/WAVC-edit.png';
import { Button } from '../components/ui/button';
import { FieldMessage } from '../components/ui/field-message';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ClubLogoDropzone } from '../components/ui/club-logo-dropzone';
import { useLogoUpload } from '../lib/useLogoUpload';

const API = '';

const ClubsSetup = () => {
  const { user, loading, logout, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    instagram_handle: '',
    category: 'TECH',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const logo = useLogoUpload({ onError: setFormError });

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-background-dark text-white">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>
  );

  if (!user || user.role !== 'CLUB_ADMIN') {
    navigate('/student/dashboard');
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
      const payload = {
        name: formData.name.trim(),
        instagram_handle: formData.instagram_handle.trim(),
        category: formData.category,
      };

      const res = await fetch(`${API}/api/clubs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const createdClub = await res.json();

        if (logo.file) {
          try {
            await logo.upload(createdClub.id);
          } catch (error) {
            console.error(error);
            await refetchUser();
            navigate('/club/profile');
            return;
          }
        }

        await refetchUser();
        navigate('/club/dashboard');
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
    <div className="min-h-dvh bg-background-light font-body text-slate-900 dark:bg-background-dark dark:text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border-subtle dark:border-border-strong bg-white dark:bg-surface-panel">
        <div className="flex items-center gap-3">
          <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          <span className="text-lg font-bold">WAVC</span>
        </div>
        <Button
          onClick={logout}
          variant="secondary"
          size="sm"
          className="border border-border-subtle"
        >
          Sign Out
        </Button>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="type-page-title mb-2 sm:text-4xl">Set up your club profile</h1>
        <p className="type-lead mb-10 text-text-secondary dark:text-text-dark-secondary">
          Tell us a bit about your club to get started. This information will be visible to all students.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {formError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <FieldMessage tone="error">{formError}</FieldMessage>
            </div>
          ) : null}
          {/* Logo Upload Area */}
          <ClubLogoDropzone
            dragActive={logo.dragActive}
            onDragEnter={logo.handleDragEnter}
            onDragOver={logo.handleDragOver}
            onDragLeave={logo.handleDragLeave}
            onDrop={logo.handleDrop}
            inputRef={logo.inputRef}
            onSelectFile={logo.setSelectedFile}
            previewSrc={logo.preview || user?.picture}
            fileName={logo.file?.name}
            title="Upload Club Logo"
            description="If you skip upload, your Google profile picture will be used. JPG, PNG, WebP up to 2 MB."
            buttonLabel="Select File"
          />

          {/* Club Name */}
          <div>
            <Label htmlFor="club-setup-name" required className="mb-2 block">Club Name</Label>
            <Input
              id="club-setup-name"
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. WAVC Robotics Club"
            />
          </div>

          {/* Instagram Handle */}
          <div>
            <Label htmlFor="club-setup-instagram" className="mb-2 block">Instagram Handle</Label>
            <div className="flex items-center px-4 py-3 rounded-xl bg-surface-muted dark:bg-border-strong">
              <span className="text-text-secondary text-base mr-1">@</span>
              <Input
                id="club-setup-instagram"
                type="text"
                value={formData.instagram_handle}
                onChange={e => setFormData(p => ({ ...p, instagram_handle: e.target.value }))}
                placeholder="wavc_robotics"
                className="h-auto flex-1 border-none bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="mb-3 block">Category</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      : 'border-border-subtle dark:border-border-strong hover:border-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.category === cat.value ? 'border-primary' : 'border-text-secondary'}`}>
                      {formData.category === cat.value && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                    </div>
                    <span className="font-bold">{cat.label}</span>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary ml-8">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6 pt-6">
            <Button type="button" variant="ghost" onClick={() => navigate('/student/dashboard')} className="text-sm font-bold text-text-secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="px-8 text-sm font-bold"
            >
              {saving ? 'Setting up...' : 'Complete Setup'}
              {!saving && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubsSetup;
