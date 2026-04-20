import React from 'react';
import DatePicker from 'react-datepicker';
import { Button } from '../ui/button';
import { FieldMessage } from '../ui/field-message';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Toast } from '../ui/toast';

const CreateEventTab = ({
  createError,
  newEvent,
  setNewEvent,
  handleCreateEvent,
  handleCreateFormKeyDown,
  creating,
  creatingPoster,
  DESCRIPTION_WORD_LIMIT,
  countWords,
  isDescriptionTooLong,
  setActiveTab,
  isCreatePosterDragActive,
  handlePosterDragEnter,
  handlePosterDragOver,
  handlePosterDragLeave,
  handlePosterDrop,
  createPosterDragCounterRef,
  setIsCreatePosterDragActive,
  setNewPosterFile,
  setNewPosterPreview,
  setCreateError,
  newPosterInputRef,
  setPosterSelection,
  openCreatePosterPicker,
  newPosterFile,
  newPosterPreview,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="dashboard-hero enter-rise-settle mb-8 p-5 sm:p-7">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="kicker-label border-white/30 bg-white/10 text-white">Publishing Console</span>
              <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">Create New Event</h1>
              <p className="mt-2 max-w-2xl text-white/82">Publish a complete event with schedule, poster, and registration setup in one flow.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setActiveTab('dashboard')}
              className="w-full bg-white/12 text-white hover:bg-white/20 sm:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Overview
            </Button>
          </div>
        </div>

        <form onSubmit={handleCreateEvent} onKeyDown={handleCreateFormKeyDown} className="space-y-5">
          {createError ? <Toast tone="error" title="Unable to create event" description={createError} /> : null}

          <section className="feature-card space-y-4 p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-text-dark-secondary">Basic Details</h2>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="create-event-title" required>Event Title</Label>
              <Input id="create-event-title" type="text" required value={newEvent.title} onChange={(event) => setNewEvent((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="e.g. Winter Coding Bootcamp"
                />
            </div>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="create-event-description">Short Description (max 100 words)</Label>
              <Textarea id="create-event-description" value={newEvent.description} onChange={(event) => setNewEvent((previous) => ({ ...previous, description: event.target.value }))}
                placeholder="Describe the event..."
                rows={3}
              />
              <FieldMessage className="mt-1" tone={isDescriptionTooLong(newEvent.description) ? 'error' : 'neutral'}>
                {countWords(newEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
              </FieldMessage>
            </div>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="create-event-keywords">Keywords (comma separated)</Label>
              <Input id="create-event-keywords" type="text" value={newEvent.keywords} onChange={(event) => setNewEvent((previous) => ({ ...previous, keywords: event.target.value }))}
                placeholder="e.g. workshop, python, machine learning"
              />
            </div>
          </section>

          <section className="feature-card space-y-4 p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-text-dark-secondary">Schedule & Venue</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary">Date & Start</Label>
                <DatePicker
                  selected={newEvent.start_time}
                  onChange={(date) => setNewEvent((previous) => ({ ...previous, start_time: date }))}
                  showTimeInput
                  dateFormat="dd MMM yyyy, h:mm aa"
                  placeholderText="Select start date and time"
                  className="modern-datetime-input w-full"
                  calendarClassName="modern-datepicker-calendar"
                  popperClassName="modern-datepicker-popper"
                  popperPlacement="bottom-start"
                  required
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary">End Time</Label>
                <DatePicker
                  selected={newEvent.end_time}
                  onChange={(date) => setNewEvent((previous) => ({ ...previous, end_time: date }))}
                  showTimeInput
                  dateFormat="dd MMM yyyy, h:mm aa"
                  placeholderText="Select end date and time"
                  minDate={newEvent.start_time || undefined}
                  className="modern-datetime-input w-full"
                  calendarClassName="modern-datepicker-calendar"
                  popperClassName="modern-datepicker-popper"
                  popperPlacement="bottom-start"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs text-text-secondary dark:text-text-dark-secondary">Category Tag</Label>
              <div className="flex gap-3">
                {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map((tag) => (
                  <button key={tag.value} type="button" onClick={() => setNewEvent((previous) => ({ ...previous, tag: tag.value }))}
                    className={`flex flex-1 items-center justify-center rounded-xl border py-2 text-sm font-medium transition-all ${
                      newEvent.tag === tag.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-border-subtle text-text-secondary hover:border-primary/40 hover:bg-surface-muted hover:text-primary dark:border-border-strong dark:text-text-dark-secondary'
                    }`}>
                    <span className="material-symbols-outlined mr-1 text-[18px]">{tag.icon}</span>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs" htmlFor="create-event-location">Location</Label>
              <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 dark:bg-border-strong">
                <span className="material-symbols-outlined text-[18px] text-text-secondary">location_on</span>
                <Input id="create-event-location" type="text" value={newEvent.location} onChange={(event) => setNewEvent((previous) => ({ ...previous, location: event.target.value }))}
                  placeholder="Add location"
                  className="h-auto border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </section>

          <section className="feature-card space-y-4 p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-text-dark-secondary">Poster & Registration</h2>
            <div>
              <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary">Event Poster (JPEG/PNG/WebP, up to 2 MB after compression)</Label>
              <div
                className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                  isCreatePosterDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border-subtle bg-surface-muted dark:border-border-strong dark:bg-surface-canvas/60'
                }`}
                onDragEnter={(event) => handlePosterDragEnter(event, setIsCreatePosterDragActive, createPosterDragCounterRef)}
                onDragOver={handlePosterDragOver}
                onDragLeave={(event) => handlePosterDragLeave(event, setIsCreatePosterDragActive, createPosterDragCounterRef)}
                onDrop={(event) => handlePosterDrop(event, setIsCreatePosterDragActive, createPosterDragCounterRef, setNewPosterFile, setNewPosterPreview, setCreateError)}
              >
                <input
                  ref={newPosterInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    setPosterSelection(selectedFile, setNewPosterFile, setNewPosterPreview, setCreateError);
                    event.target.value = '';
                  }}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={openCreatePosterPicker}
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Choose Poster
                  </Button>
                  <span className="max-w-64 truncate text-xs text-text-secondary dark:text-text-dark-secondary">{newPosterFile ? newPosterFile.name : 'No file selected'}</span>
                </div>
                <p className="mt-2 text-xs text-text-secondary dark:text-text-dark-secondary">or drag and drop an image here</p>
              </div>
              {newPosterPreview && (
                <div className="mt-3 aspect-4/5 w-full max-w-52 overflow-hidden rounded-lg border border-border-subtle bg-[#0f1720] dark:border-border-strong">
                  <img src={newPosterPreview} alt="Poster preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div className="mb-2 flex items-center gap-2">
              <input type="checkbox" id="is_paid" checked={newEvent.is_paid || false} onChange={(event) => setNewEvent((previous) => ({ ...previous, is_paid: event.target.checked }))} className="size-4 cursor-pointer rounded-full border border-border-subtle bg-surface-muted text-primary focus:ring-2 focus:ring-primary" />
              <Label htmlFor="is_paid" className="text-sm">This is a paid event</Label>
            </div>

            {newEvent.is_paid && (
              <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-canvas/70 p-4 dark:border-border-strong dark:bg-surface-canvas/35">
                <div>
                  <Label className="mb-1 block text-xs" htmlFor="create-event-fees">Registration Fees</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 dark:bg-border-strong">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">payments</span>
                    <Input id="create-event-fees" type="text" value={newEvent.registration_fees || ''} onChange={(event) => setNewEvent((previous) => ({ ...previous, registration_fees: event.target.value }))}
                      placeholder="e.g. ₹500"
                      className="h-auto border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor="create-event-payment-link">Payment Link (Optional)</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 dark:bg-border-strong">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">link</span>
                    <Input id="create-event-payment-link" type="url" value={newEvent.payment_link || ''} onChange={(event) => setNewEvent((previous) => ({ ...previous, payment_link: event.target.value }))}
                      placeholder="e.g. https://rzp.io/l/..."
                      className="h-auto border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <Button type="submit" disabled={creating || creatingPoster} className="h-12 w-full text-sm font-semibold">
            {creating ? 'Publishing...' : creatingPoster ? 'Uploading poster...' : 'Publish Event'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventTab;
