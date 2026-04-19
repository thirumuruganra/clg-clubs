import React from 'react';
import DatePicker from 'react-datepicker';

const CreateEventTab = ({
  createError,
  newEvent,
  setNewEvent,
  handleCreateEvent,
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Create New Event</h1>
            <p className="mt-1 text-[#637588] dark:text-[#92adc9]">Publish a new club event with schedule, details, and poster.</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[#f0f2f4] dark:border-[#233648] dark:bg-[#1a2632] dark:hover:bg-[#233648]"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Overview
          </button>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-5">
          {createError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{createError}</p>}

          <section className="space-y-4 rounded-xl border border-[#e5e7eb] bg-white p-5 dark:border-[#233648] dark:bg-[#1a2632] sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#637588] dark:text-[#92adc9]">Basic Details</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Event Title</label>
              <input type="text" required value={newEvent.title} onChange={(event) => setNewEvent((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="e.g. Winter Coding Bootcamp"
                className="w-full rounded-lg border-none bg-[#f0f2f4] px-3 py-2 text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#233648] dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Short Description (max 100 words)</label>
              <textarea value={newEvent.description} onChange={(event) => setNewEvent((previous) => ({ ...previous, description: event.target.value }))}
                placeholder="Describe the event..."
                rows={3}
                className="w-full resize-none rounded-lg border-none bg-[#f0f2f4] px-3 py-2 text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#233648] dark:text-white" />
              <p className={`mt-1 text-xs ${isDescriptionTooLong(newEvent.description) ? 'text-red-500' : 'text-[#637588] dark:text-[#92adc9]'}`}>
                {countWords(newEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Keywords (comma separated)</label>
              <input type="text" value={newEvent.keywords} onChange={(event) => setNewEvent((previous) => ({ ...previous, keywords: event.target.value }))}
                placeholder="e.g. workshop, python, machine learning"
                className="w-full rounded-lg border-none bg-[#f0f2f4] px-3 py-2 text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#233648] dark:text-white" />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-[#e5e7eb] bg-white p-5 dark:border-[#233648] dark:bg-[#1a2632] sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#637588] dark:text-[#92adc9]">Schedule & Venue</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Date & Start</label>
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
                <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">End Time</label>
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
              <label className="mb-2 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Category Tag</label>
              <div className="flex gap-3">
                {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map((tag) => (
                  <button key={tag.value} type="button" onClick={() => setNewEvent((previous) => ({ ...previous, tag: tag.value }))}
                    className={`flex flex-1 items-center justify-center rounded-xl border py-2 text-sm font-medium transition-all ${
                      newEvent.tag === tag.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-[#e5e7eb] text-[#637588] hover:border-primary/40 hover:text-primary dark:border-[#233648] dark:text-[#92adc9]'
                    }`}>
                    <span className="material-symbols-outlined mr-1 text-[18px]">{tag.icon}</span>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Location</label>
              <div className="flex items-center gap-2 rounded-lg bg-[#f0f2f4] px-3 py-2 dark:bg-[#233648]">
                <span className="material-symbols-outlined text-[18px] text-[#637588]">location_on</span>
                <input type="text" value={newEvent.location} onChange={(event) => setNewEvent((previous) => ({ ...previous, location: event.target.value }))}
                  placeholder="Add location"
                  className="flex-1 border-none bg-transparent text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none dark:text-white" />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-[#e5e7eb] bg-white p-5 dark:border-[#233648] dark:bg-[#1a2632] sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#637588] dark:text-[#92adc9]">Poster & Registration</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Event Poster (JPEG/PNG/WebP, up to 2 MB after compression)</label>
              <div
                className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                  isCreatePosterDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-[#e5e7eb] bg-[#f8fafc] dark:border-[#233648] dark:bg-[#0f1720]/40'
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
                  <button
                    type="button"
                    onClick={openCreatePosterPicker}
                    className="touch-target inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#f0f2f4] dark:border-[#233648] dark:hover:bg-[#233648]"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Choose Poster
                  </button>
                  <span className="max-w-64 truncate text-xs text-[#637588] dark:text-[#92adc9]">{newPosterFile ? newPosterFile.name : 'No file selected'}</span>
                </div>
                <p className="mt-2 text-xs text-[#637588] dark:text-[#92adc9]">or drag and drop an image here</p>
              </div>
              {newPosterPreview && (
                <div className="mt-3 aspect-4/5 w-full max-w-52 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#0f1720] dark:border-[#233648]">
                  <img src={newPosterPreview} alt="Poster preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div className="mb-2 flex items-center gap-2">
              <input type="checkbox" id="is_paid" checked={newEvent.is_paid || false} onChange={(event) => setNewEvent((previous) => ({ ...previous, is_paid: event.target.checked }))} className="h-4 w-4 cursor-pointer rounded-full border-gray-300 bg-gray-100 text-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-[#34485c] dark:bg-[#1a2632]" />
              <label htmlFor="is_paid" className="text-sm font-medium text-[#111418] dark:text-white">This is a paid event</label>
            </div>

            {newEvent.is_paid && (
              <div className="space-y-4 rounded-lg border border-[#e5e7eb] p-4 dark:border-[#233648]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Registration Fees</label>
                  <div className="flex items-center gap-2 rounded-lg bg-[#f0f2f4] px-3 py-2 dark:bg-[#233648]">
                    <span className="material-symbols-outlined text-[18px] text-[#637588]">payments</span>
                    <input type="text" value={newEvent.registration_fees || ''} onChange={(event) => setNewEvent((previous) => ({ ...previous, registration_fees: event.target.value }))}
                      placeholder="e.g. ₹500"
                      className="flex-1 border-none bg-transparent text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#637588] dark:text-[#92adc9]">Payment Link (Optional)</label>
                  <div className="flex items-center gap-2 rounded-lg bg-[#f0f2f4] px-3 py-2 dark:bg-[#233648]">
                    <span className="material-symbols-outlined text-[18px] text-[#637588]">link</span>
                    <input type="url" value={newEvent.payment_link || ''} onChange={(event) => setNewEvent((previous) => ({ ...previous, payment_link: event.target.value }))}
                      placeholder="e.g. https://rzp.io/l/..."
                      className="flex-1 border-none bg-transparent text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none dark:text-white" />
                  </div>
                </div>
              </div>
            )}
          </section>

          <button type="submit" disabled={creating || creatingPoster}
            className="w-full rounded-xl border border-primary bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
            {creating ? 'Publishing...' : creatingPoster ? 'Uploading poster...' : 'Publish Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventTab;
