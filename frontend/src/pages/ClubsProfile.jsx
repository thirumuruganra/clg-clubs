import React, { useEffect, useState, useCallback } from 'react';
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

const ClubsProfile = () => {
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
  const logo = useLogoUpload({ onError: setFormError });

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

      if (logo.file) {
        const uploadPayload = await logo.upload(updatedClub.id);
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
      logo.reset();
      setSuccessMessage('Club profile updated successfully.');
    } catch (error) {
      console.error(error);
      setFormError('Failed to update club profile.');
    } finally {
      setSaving(false);
    }
  };

  const resolvedPreviewImage = logo.preview || formData.logo_url.trim() || user?.picture || '';

  if (loading || loadingClub) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-dark text-white">
        <div className="animate-pulse text-lg">Loading club profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-light font-body text-slate-900 dark:bg-background-dark dark:text-white">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border-subtle dark:border-border-strong bg-white dark:bg-surface-panel">
        <div className="flex items-center gap-3">
          <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          <span className="text-lg font-bold">WAVC</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={() => navigate('/club/dashboard')}
            variant="secondary"
            size="sm"
            className="border border-border-subtle"
          >
            Back to Dashboard
          </Button>
          <Button
            type="button"
            onClick={logout}
            variant="secondary"
            size="sm"
            className="border border-border-subtle"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="type-page-title mb-2 sm:text-4xl">Club Profile</h1>
        <p className="type-lead mb-10 text-text-secondary dark:text-text-dark-secondary">
          Update club details shown to students across clubs, calendar, and profile suggestions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {formError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <FieldMessage tone="error">{formError}</FieldMessage>
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
              <FieldMessage tone="success">{successMessage}</FieldMessage>
            </div>
          ) : null}

          <ClubLogoDropzone
            dragActive={logo.dragActive}
            onDragEnter={logo.handleDragEnter}
            onDragOver={logo.handleDragOver}
            onDragLeave={logo.handleDragLeave}
            onDrop={logo.handleDrop}
            inputRef={logo.inputRef}
            onSelectFile={logo.setSelectedFile}
            previewSrc={resolvedPreviewImage}
            fileName={logo.file?.name}
            description="If no custom image is set, your Google profile picture will be used automatically."
            emptyLabel="No new file selected"
            onPreviewClick={logo.openFilePicker}
            extraButton={(
              <Button
                type="button"
                onClick={() => {
                  logo.reset();
                  setFormData((previous) => ({ ...previous, logo_url: '' }));
                }}
                variant="secondary"
                size="sm"
                className="border border-border-subtle"
              >
                Use Google Picture
              </Button>
            )}
          />

          <div>
            <Label htmlFor="club-profile-name" required className="mb-2 block">Club Name</Label>
            <Input
              id="club-profile-name"
              type="text"
              required
              value={formData.name}
              onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="e.g. WAVC Robotics Club"
            />
          </div>

          <div>
            <Label htmlFor="club-profile-instagram" className="mb-2 block">Instagram Handle</Label>
            <div className="flex items-center px-4 py-3 rounded-xl bg-surface-muted dark:bg-border-strong">
              <span className="text-text-secondary text-base mr-1">@</span>
              <Input
                id="club-profile-instagram"
                type="text"
                value={formData.instagram_handle}
                onChange={(event) => setFormData((previous) => ({ ...previous, instagram_handle: event.target.value }))}
                placeholder="wavc_robotics"
                className="h-auto flex-1 border-none bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Category</Label>
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
                      : 'border-border-subtle dark:border-border-strong hover:border-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.category === category.value ? 'border-primary' : 'border-text-secondary'}`}>
                      {formData.category === category.value && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                    </div>
                    <span className="font-bold">{category.label}</span>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary ml-8">{category.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-6">
            <Button
              type="button"
              onClick={() => navigate('/club/dashboard')}
              variant="secondary"
              className="border border-border-subtle px-6 text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="px-8 text-sm font-bold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubsProfile;
