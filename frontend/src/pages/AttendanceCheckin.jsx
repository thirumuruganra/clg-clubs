import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';

const API = '';

const AttendanceCheckin = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const eventId = params.get('event_id');
  const qrCode = params.get('qr');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventTitle, setEventTitle] = useState('');

  const canAttemptCheckin = useMemo(() => {
    return Boolean(user && eventId && qrCode);
  }, [user, eventId, qrCode]);

  useEffect(() => {
    if (!canAttemptCheckin) return;

    let cancelled = false;

    const runCheckin = async () => {
      setSubmitting(true);
      setError('');
      setSuccess('');

      try {
        const eventRes = await fetch(`${API}/api/events/${eventId}?user_id=${user.id}`);
        if (eventRes.ok && !cancelled) {
          const eventData = await eventRes.json();
          setEventTitle(eventData.title || '');
        }

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
        if (cancelled) return;

        if (data.action === 'registered_and_marked_attended') {
          setSuccess('You were registered for this event and your attendance is marked.');
        } else if (data.action === 'already_attended') {
          setSuccess('Your attendance was already marked for this event.');
        } else {
          setSuccess('Your attendance is marked successfully.');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Unable to mark attendance.');
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    };

    void runCheckin();

    return () => {
      cancelled = true;
    };
  }, [canAttemptCheckin, eventId, qrCode, user]);

  const renderBody = () => {
    if (!eventId || !qrCode) {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Invalid attendance QR link. Ask the club to display a valid QR code.
        </div>
      );
    }

    if (loading) {
      return <p className="text-sm text-[#637588] dark:text-[#92adc9]">Checking your account...</p>;
    }

    if (!user) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-[#637588] dark:text-[#92adc9]">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] dark:border-[#233648] px-4 py-2 text-sm font-bold text-slate-700 dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
            >
              Open Login Page
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {eventTitle && (
          <p className="text-sm text-[#637588] dark:text-[#92adc9]">
            Event: <span className="font-semibold text-slate-800 dark:text-white">{eventTitle}</span>
          </p>
        )}

        {submitting && (
          <div className="flex items-center gap-2 text-sm text-[#637588] dark:text-[#92adc9]">
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
            className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] dark:border-[#233648] px-4 py-2 text-sm font-bold text-slate-700 dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Retry
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] shadow-lg p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Event Attendance Check-In</h1>
          <p className="mt-1 text-sm text-[#637588] dark:text-[#92adc9]">
            Scan-based attendance for WAVC events.
          </p>
        </div>

        {renderBody()}
      </div>
    </div>
  );
};

export default AttendanceCheckin;
