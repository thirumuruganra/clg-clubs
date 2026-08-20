import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';

const API = '';
const FEEDBACK_MAX_LENGTH = 100;

const StudentAttendanceCheckin = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const eventId = params.get('event_id');
  const qrCode = params.get('qr');

  const [eventLoading, setEventLoading] = useState(true);
  const [eventInfo, setEventInfo] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const buildSuccessMessage = (action, attendanceRole) => {
    const roleLabel = attendanceRole === 'CLUB_MEMBER'
      ? 'club member'
      : attendanceRole === 'VOLUNTEER'
        ? 'volunteer'
        : 'student participant';

    if (action === 'registered_and_marked_attended') {
      return `You were registered as a ${roleLabel} and your attendance is marked.`;
    }
    if (action === 'already_attended') {
      return `Your attendance was already marked as a ${roleLabel}.`;
    }
    return `Your attendance is marked successfully as a ${roleLabel}.`;
  };

  const canAttemptCheckin = useMemo(() => {
    return Boolean(user && eventId && qrCode);
  }, [user, eventId, qrCode]);

  const submitCheckin = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/rsvp/events/${eventId}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Unable to mark attendance.');
      }

      const data = await res.json();
      setSuccess(buildSuccessMessage(data.action, data.attendance_role));
    } catch (err) {
      setError(err.message || 'Unable to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async (feedbackValue) => {
    setFeedbackSubmitting(true);
    setFeedbackError('');

    try {
      const res = await fetch(`${API}/api/rsvp/events/${eventId}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode, feedback: feedbackValue }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Unable to submit feedback.');
      }

      setFeedbackDone(true);
    } catch (err) {
      setFeedbackError(err.message || 'Unable to submit feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    if (!canAttemptCheckin) {
      setEventLoading(false);
      return;
    }

    let cancelled = false;

    const loadEventThenCheckin = async () => {
      setEventLoading(true);

      try {
        const eventRes = await fetch(`${API}/api/events/${eventId}?user_id=${user.id}`);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          if (!cancelled) setEventInfo(eventData);
        }
      } finally {
        if (!cancelled) setEventLoading(false);
      }

      // Attendance is marked the moment the QR is scanned; feedback (if the
      // event collects it) is a separate, optional follow-up shown after.
      if (!cancelled) {
        await submitCheckin();
      }
    };

    void loadEventThenCheckin();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAttemptCheckin, eventId, qrCode, user]);

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    const trimmedFeedback = feedbackText.trim();
    if (!trimmedFeedback) return;
    void submitFeedback(trimmedFeedback);
  };

  const showFeedbackPrompt = Boolean(eventInfo?.collect_feedback) && Boolean(success) && !feedbackDone;

  const renderBody = () => {
    if (!eventId || !qrCode) {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Invalid attendance QR link. Ask the club to display a valid QR code.
        </div>
      );
    }

    if (loading) {
      return <p className="text-sm text-text-secondary dark:text-text-dark-secondary">Checking your account...</p>;
    }

    if (!user) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
            Login or create your account first, then scan this QR again to mark attendance.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/auth/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Continue with Google
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-surface-muted dark:border-border-strong dark:text-white dark:hover:bg-border-strong"
            >
              Open Login Page
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {eventInfo?.title && (
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
            Event: <span className="font-semibold text-slate-800 dark:text-white">{eventInfo.title}</span>
          </p>
        )}

        {eventLoading && (
          <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-dark-secondary">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
            Loading event...
          </div>
        )}

        {!eventLoading && submitting && (
          <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-dark-secondary">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
            Marking your attendance...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {showFeedbackPrompt && (
          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <div>
              <label htmlFor="attendance-feedback" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-white">
                Share quick feedback to complete check-in
              </label>
              <textarea
                id="attendance-feedback"
                required
                maxLength={FEEDBACK_MAX_LENGTH}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What did you think of this event?"
                rows={3}
                className="w-full rounded-lg border border-border-subtle bg-transparent px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none dark:border-border-strong dark:text-white"
              />
              <p className="mt-1 text-right text-xs text-text-secondary dark:text-text-dark-secondary">
                {feedbackText.length}/{FEEDBACK_MAX_LENGTH}
              </p>
            </div>
            {feedbackError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {feedbackError}
              </div>
            )}
            <button
              type="submit"
              disabled={feedbackSubmitting || !feedbackText.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {feedbackSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        )}

        {feedbackDone && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            Thanks for your feedback!
          </div>
        )}

        {!showFeedbackPrompt && (
          <div className="flex flex-wrap gap-3">
            <Link
              to="/student/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Go to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-surface-muted dark:border-border-strong dark:text-white dark:hover:bg-border-strong"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-background-light px-4 py-10 font-body dark:bg-background-dark flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-white p-6 shadow-lg space-y-4 dark:border-border-strong dark:bg-[#1a2632]">
        <div>
          <h1 className="type-page-title text-slate-900 dark:text-white sm:text-4xl">Event Attendance Check-In</h1>
          <p className="type-body mt-1 text-text-secondary dark:text-text-dark-secondary">
            Scan-based attendance for WAVC events.
          </p>
        </div>

        {renderBody()}
      </div>
    </div>
  );
};

export default StudentAttendanceCheckin;
