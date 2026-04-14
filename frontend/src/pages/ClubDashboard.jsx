import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import DatePicker from 'react-datepicker';
import imageCompression from 'browser-image-compression';
import 'react-datepicker/dist/react-datepicker.css';
import { QRCodeSVG } from 'qrcode.react';
import wavcIcon from '../assets/WAVC-edit.png';
import ClubCalendar from './ClubCalendar';
import { cn, getClubIconUrl } from '../lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const API = '';
const DESCRIPTION_WORD_LIMIT = 100;
const POSTER_MAX_SIZE_MB = 2;
const POSTER_MAX_SIZE_BYTES = POSTER_MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMPTY_EVENT_FORM = {
  title: '',
  description: '',
  keywords: '',
  location: '',
  start_time: null,
  end_time: null,
  tag: 'TECH',
  image_url: '',
  payment_link: '',
  is_paid: false,
  registration_fees: '',
};

const countWords = (value = '') => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const isDescriptionTooLong = (value = '') => countWords(value) > DESCRIPTION_WORD_LIMIT;

const pad = (value) => String(value).padStart(2, '0');

const formatLocalDateTimeForApi = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return null;

  const year = dateValue.getFullYear();
  const month = pad(dateValue.getMonth() + 1);
  const day = pad(dateValue.getDate());
  const hours = pad(dateValue.getHours());
  const minutes = pad(dateValue.getMinutes());
  const seconds = pad(dateValue.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const parseApiDateTime = (rawValue) => {
  if (!rawValue) return null;

  const normalized = String(rawValue).replace('Z', '').split('.')[0];
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hours = Number(match[4]);
    const minutes = Number(match[5]);
    const seconds = Number(match[6] || 0);
    const localDate = new Date(year, month, day, hours, minutes, seconds);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const fallback = new Date(rawValue);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatAttendanceMarkedAt = (rawValue) => {
  const parsed = parseApiDateTime(rawValue);
  if (!parsed) return '-';

  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [event.title, event.description, event.keywords]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const normalizeValue = (value) => (value ? String(value).trim().toLowerCase() : '');

const normalizeAlphaNum = (value) =>
  normalizeValue(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeCompact = (value) => normalizeAlphaNum(value).replace(/\s+/g, '');

const normalizeNameKey = (value) => {
  const parts = normalizeAlphaNum(value).split(' ').filter(Boolean);
  return parts.sort().join(' ');
};

const nameParts = (value) => normalizeAlphaNum(value).split(' ').filter(Boolean);

const normalizeDepartment = (value) => {
  const compact = normalizeCompact(value);
  if (!compact) return '';

  if (compact.includes('computer') && compact.includes('science')) return 'cse';
  if (compact.includes('cse')) return 'cse';
  if (compact.includes('ece')) return 'ece';
  if (compact.includes('mech')) return 'mech';
  if (compact.includes('civil')) return 'civil';
  if (compact.includes('it')) return 'it';

  return compact;
};

const normalizeYearLabel = (value) => {
  const raw = normalizeValue(value);
  if (!raw) return '';

  if (/\b(iv|4|4th|fourth)\b/.test(raw)) return 'IV';
  if (/\b(iii|3|3rd|third)\b/.test(raw)) return 'III';
  if (/\b(ii|2|2nd|second)\b/.test(raw)) return 'II';
  if (/\b(i|1|1st|first)\b/.test(raw)) return 'I';

  return '';
};

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const buildTokenSet = (row) => {
  const tokens = new Set();

  row.forEach((value) => {
    const normalized = normalizeAlphaNum(value);
    if (!normalized) return;

    normalized.split(' ').forEach((token) => {
      if (token) tokens.add(token);
    });

    tokens.add(normalizeCompact(value));
  });

  tokens.delete('');
  return tokens;
};

const getHeaderIndex = (normalizedHeaders, headerAliases) => {
  for (const alias of headerAliases) {
    const idx = normalizedHeaders.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
};

const evaluatePaymentMatch = (user, payment, calculatedYear) => {
  const userEmail = normalizeValue(user.email);
  const userRegister = normalizeCompact(user.register_number);
  const userNameKey = normalizeNameKey(user.name);
  const userNameParts = nameParts(user.name);
  const userDepartment = normalizeDepartment(user.department);
  const userYear = normalizeYearLabel(calculatedYear);

  const paymentEmail = payment.email;
  const paymentNameKey = payment.nameKey;
  const paymentNameParts = payment.nameParts;

  const emailMatch = Boolean(userEmail && paymentEmail && userEmail === paymentEmail);
  const registerMatch = Boolean(userRegister && payment.tokens.has(userRegister));
  const nameKeyMatch = Boolean(userNameKey && paymentNameKey && userNameKey === paymentNameKey);

  let overlapCount = 0;
  if (userNameParts.length && paymentNameParts.length) {
    const paymentPartSet = new Set(paymentNameParts);
    overlapCount = userNameParts.filter((part) => paymentPartSet.has(part)).length;
  }

  const nameOverlapMatch = overlapCount >= 2;
  const departmentMatch = Boolean(userDepartment && payment.department && userDepartment === payment.department);
  const yearMatch = Boolean(userYear && payment.year && userYear === payment.year);

  const departmentConflict = Boolean(userDepartment && payment.department && userDepartment !== payment.department);
  const yearConflict = Boolean(userYear && payment.year && userYear !== payment.year);

  const primaryMatch = emailMatch || registerMatch || nameKeyMatch || (nameOverlapMatch && (departmentMatch || yearMatch));
  if (!primaryMatch) {
    return { isMatch: false, score: 0, detailConflicts: [] };
  }

  let score = 0;
  if (emailMatch) score += 220;
  if (registerMatch) score += 200;
  if (nameKeyMatch) score += 160;
  if (nameOverlapMatch) score += 100;
  if (departmentMatch) score += 25;
  if (yearMatch) score += 20;
  if (departmentConflict) score -= 15;
  if (yearConflict) score -= 10;

  const detailConflicts = [];
  if (departmentConflict) detailConflicts.push('department');
  if (yearConflict) detailConflicts.push('year');

  return {
    isMatch: true,
    score,
    detailConflicts,
  };
};

const ClubDashboard = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [tableError, setTableError] = useState('');
  const [rsvpError, setRsvpError] = useState('');
  const [paymentFeedback, setPaymentFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const calendarConsentUrl = '/api/auth/login/calendar?next=/club/dashboard';

  // Quick Create form
  const [newEvent, setNewEvent] = useState(EMPTY_EVENT_FORM);
  const [newPosterFile, setNewPosterFile] = useState(null);
  const [newPosterPreview, setNewPosterPreview] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingPoster, setCreatingPoster] = useState(false);

  // Edit Modal
  const [editEvent, setEditEvent] = useState(null);
  const [editPosterFile, setEditPosterFile] = useState(null);
  const [editPosterPreview, setEditPosterPreview] = useState('');
  const [editing, setEditing] = useState(false);
  const [editingPoster, setEditingPoster] = useState(false);

  useEffect(() => {
    return () => {
      if (newPosterPreview) URL.revokeObjectURL(newPosterPreview);
    };
  }, [newPosterPreview]);

  useEffect(() => {
    return () => {
      if (editPosterPreview) URL.revokeObjectURL(editPosterPreview);
    };
  }, [editPosterPreview]);

  const setPosterSelection = (file, setFile, setPreview, setError) => {
    setError('');

    if (!file) {
      setFile(null);
      setPreview('');
      return;
    }

    if (!ALLOWED_POSTER_TYPES.includes(file.type)) {
      setError('Poster must be JPEG, PNG, or WebP.');
      setFile(null);
      setPreview('');
      return;
    }

    setFile(file);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const compressPosterFile = async (posterFile) => {
    const compressed = await imageCompression(posterFile, {
      maxSizeMB: POSTER_MAX_SIZE_MB,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
      fileType: posterFile.type,
    });

    if (compressed.size > POSTER_MAX_SIZE_BYTES) {
      throw new Error(`Compressed poster must be ${POSTER_MAX_SIZE_MB} MB or smaller.`);
    }

    return compressed;
  };

  const uploadPosterForEvent = async (eventId, posterFile) => {
    const compressedPoster = await compressPosterFile(posterFile);
    const formData = new FormData();
    formData.append('file', compressedPoster, compressedPoster.name || posterFile.name || 'event-poster');

    const response = await fetch(`${API}/api/events/${eventId}/poster`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || 'Poster upload failed.');
    }

    return response.json();
  };

  const resetCreateEventForm = () => {
    setNewEvent(EMPTY_EVENT_FORM);
    setNewPosterFile(null);
    setNewPosterPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return '';
    });
  };

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const clubsRes = await fetch(`${API}/api/clubs/`);
      if (clubsRes.ok) {
        const clubs = await clubsRes.json();
        let myClub = clubs.find(c => c.admin_id === user.id);
        if (!myClub) { navigate('/club/setup'); return; }
        
        if (myClub.instagram_handle) {
          try {
            await fetch(`${API}/api/clubs/${myClub.id}/sync-instagram`, { method: 'POST' });
            const updatedClubRes = await fetch(`${API}/api/clubs/${myClub.id}`);
            if (updatedClubRes.ok) {
              myClub = await updatedClubRes.json();
            }
          } catch (err) {
            console.error('Failed to sync instagram logo', err);
          }
        }
        
        setClub(myClub);
        const eventsRes = await fetch(`${API}/api/clubs/${myClub.id}/events`);
        if (eventsRes.ok) setEvents(await eventsRes.json());
      }
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  }, [navigate, user]);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user && user.role !== 'CLUB_ADMIN') { navigate('/student/dashboard'); return; }
    if (user) void fetchData();
  }, [user, loading, navigate, fetchData]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!club) return;
    setCreateError('');
    if (!newEvent.start_time || !newEvent.end_time) {
      setCreateError('Please choose both start and end date/time.');
      return;
    }
    if (newEvent.end_time <= newEvent.start_time) {
      setCreateError('End time must be after start time.');
      return;
    }
    if (isDescriptionTooLong(newEvent.description)) {
      setCreateError(`Description must be ${DESCRIPTION_WORD_LIMIT} words or fewer.`);
      return;
    }

    setCreating(true);
    try {
      const body = {
        ...newEvent,
        club_id: club.id,
        image_url: null,
        start_time: formatLocalDateTimeForApi(newEvent.start_time),
        end_time: formatLocalDateTimeForApi(newEvent.end_time),
      };

      const res = await fetch(`${API}/api/events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const createdEvent = await res.json();
        let posterUploadError = '';

        if (newPosterFile) {
          setCreatingPoster(true);
          try {
            await uploadPosterForEvent(createdEvent.id, newPosterFile);
          } catch (err) {
            posterUploadError = err?.message || 'Poster upload failed.';
          } finally {
            setCreatingPoster(false);
          }
        }

        resetCreateEventForm();
        setCreateError('');
        if (posterUploadError) {
          setTableError(`Event created, but poster upload failed: ${posterUploadError}`);
        }
        void fetchData();
        setCreateModalOpen(false);
      } else {
        const data = await res.json();
        setCreateError(data.detail || 'Failed to create event.');
      }
    } catch {
      setCreateError('Error creating event.');
    }
    finally { setCreating(false); }
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTarget) return;
    setTableError('');
    try {
      const res = await fetch(`${API}/api/events/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        setTableError(data.detail || 'Failed to delete event.');
      }
    } catch (err) {
      console.error(err);
      setTableError('Error deleting event.');
    }
  };

  const openEditModal = (event) => {
    setEditPosterFile(null);
    setEditPosterPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return '';
    });
    setEditEvent({
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      start_time: parseApiDateTime(event.start_time),
      end_time: parseApiDateTime(event.end_time),
      tag: event.tag || 'TECH',
      image_url: event.image_url || '',
      keywords: event.keywords || '',
      payment_link: event.payment_link || '',
      is_paid: event.is_paid || false,
      registration_fees: event.registration_fees || '',
    });
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editEvent) return;
    setEditError('');
    if (!editEvent.start_time || !editEvent.end_time) {
      setEditError('Please choose both start and end date/time.');
      return;
    }
    if (editEvent.end_time <= editEvent.start_time) {
      setEditError('End time must be after start time.');
      return;
    }
    if (isDescriptionTooLong(editEvent.description)) {
      setEditError(`Description must be ${DESCRIPTION_WORD_LIMIT} words or fewer.`);
      return;
    }

    setEditing(true);
    try {
      const body = {
        ...editEvent,
        start_time: formatLocalDateTimeForApi(editEvent.start_time),
        end_time: formatLocalDateTimeForApi(editEvent.end_time),
      };
      delete body.id;

      const res = await fetch(`${API}/api/events/${editEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        let posterUploadError = '';

        if (editPosterFile) {
          setEditingPoster(true);
          try {
            await uploadPosterForEvent(editEvent.id, editPosterFile);
          } catch (err) {
            posterUploadError = err?.message || 'Poster upload failed.';
          } finally {
            setEditingPoster(false);
          }
        }

        setEditError('');
        setEditEvent(null);
        setEditPosterFile(null);
        setEditPosterPreview((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return '';
        });
        if (posterUploadError) {
          setTableError(`Event updated, but poster upload failed: ${posterUploadError}`);
        }
        void fetchData();
      } else {
        const data = await res.json();
        setEditError(data.detail || 'Failed to update event.');
      }
    } catch {
      setEditError('Error updating event.');
    }
    finally { setEditing(false); }
  };

  const [rsvpModal, setRsvpModal] = useState({ open: false, event: null, rsvps: [], loading: false, tab: "attendance" });
  const [qrModal, setQrModal] = useState({
    open: false,
    event: null,
    loading: false,
    checkinUrl: '',
    error: '',
    notice: '',
  });

  const calculateYear = (batchStr) => {
    if (!batchStr) return '-';
    const passout = parseInt(batchStr, 10);
    if (isNaN(passout)) return '-';
    // Assume batchStr is passout batch
    const currentYear = new Date().getFullYear();
    const diff = passout - currentYear;
    // Current mapping (assuming current year is fall semester or similar):
    // If passout is 2026 and current is 2026 -> Final Year (IV)
    if (diff === 0) return 'IV';
    if (diff === 1) return 'III';
    if (diff === 2) return 'II';
    if (diff === 3) return 'I';
    if (diff < 0) return 'Alumni';
    return '-';
  };

  const openRsvpModal = async (eventObj) => {
    setRsvpError('');
    setPaymentFeedback(null);
    setRsvpModal({ open: true, event: eventObj, rsvps: [], loading: true, tab: "attendance" });
    try {
      const res = await fetch(`${API}/api/rsvp/events/${eventObj.id}/rsvps`);
      if (res.ok) {
        const data = await res.json();
        setRsvpModal(prev => ({ ...prev, rsvps: data.rsvps || [], loading: false }));
      } else {
        setRsvpModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      setRsvpModal(prev => ({ ...prev, loading: false }));
    }
  };

  const closeQrModal = () => {
    setQrModal({ open: false, event: null, loading: false, checkinUrl: '', error: '', notice: '' });
  };

  const syncEventQrStatus = (eventId, isOpen) => {
    setEvents(prev => prev.map(event => (
      event.id === eventId ? { ...event, attendance_qr_open: isOpen } : event
    )));
  };

  const openQrModal = async (eventObj) => {
    setQrModal({ open: true, event: eventObj, loading: true, checkinUrl: '', error: '', notice: '' });
    try {
      const res = await fetch(`${API}/api/events/${eventObj.id}/attendance-qr`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to load attendance QR.');
      }
      const data = await res.json();
      setQrModal(prev => ({
        ...prev,
        loading: false,
        checkinUrl: data.checkin_url || '',
        event: prev.event ? { ...prev.event, attendance_qr_open: Boolean(data.attendance_qr_open) } : prev.event,
      }));
      syncEventQrStatus(eventObj.id, Boolean(data.attendance_qr_open));
    } catch (err) {
      setQrModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load attendance QR.',
      }));
    }
  };

  const toggleQrAttendance = async (open) => {
    if (!qrModal.event) return;
    setQrModal(prev => ({ ...prev, loading: true, error: '', notice: '' }));
    try {
      const endpoint = open ? 'open' : 'close';
      const res = await fetch(`${API}/api/events/${qrModal.event.id}/attendance-qr/${endpoint}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to ${open ? 'open' : 'close'} attendance QR.`);
      }

      const data = await res.json();
      const isOpen = Boolean(data.attendance_qr_open);

      setQrModal(prev => ({
        ...prev,
        loading: false,
        checkinUrl: data.checkin_url || prev.checkinUrl,
        event: prev.event ? { ...prev.event, attendance_qr_open: isOpen } : prev.event,
        notice: `Attendance QR is now ${isOpen ? 'open' : 'closed'}.`,
      }));
      syncEventQrStatus(qrModal.event.id, isOpen);
    } catch (err) {
      setQrModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to update attendance QR status.',
      }));
    }
  };

  const copyQrLink = async () => {
    if (!qrModal.checkinUrl) return;
    try {
      await navigator.clipboard.writeText(qrModal.checkinUrl);
      setQrModal(prev => ({ ...prev, notice: 'Attendance link copied.' }));
    } catch {
      setQrModal(prev => ({ ...prev, error: 'Could not copy link. Please copy it manually.' }));
    }
  };

  const handleToggleAttendance = async (rsvpId, currentStatus) => {
    const newStatus = !currentStatus;
    // Optimistic UI update
    setRsvpModal(prev => ({
      ...prev,
      rsvps: prev.rsvps.map(r => r.id === rsvpId ? { ...r, attended: newStatus } : r)
    }));
    setEvents(prev => prev.map(e => {
        if (e.id === rsvpModal.event.id) {
            return { ...e, attended_count: (e.attended_count || 0) + (newStatus ? 1 : -1) };
        }
        return e;
    }));
    try {
      const res = await fetch(`${API}/api/rsvp/rsvps/${rsvpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: newStatus })
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.error('Failed to update attendance:', e);
      // Rollback on error
      setRsvpModal(prev => ({
        ...prev,
        rsvps: prev.rsvps.map(r => r.id === rsvpId ? { ...r, attended: currentStatus } : r)
      }));
      setEvents(prev => prev.map(e => {
          if (e.id === rsvpModal.event.id) {
              return { ...e, attended_count: (e.attended_count || 0) + (currentStatus ? 1 : -1) };
          }
          return e;
      }));
    }
  };


  const handleTogglePayment = async (rsvpId, currentStatus) => {
    const newStatus = !currentStatus;
    setRsvpModal(prev => ({
      ...prev,
      rsvps: prev.rsvps.map(r => r.id === rsvpId ? { ...r, is_paid: newStatus } : r)
    }));
    try {
      const res = await fetch(`${API}/api/rsvp/rsvps/${rsvpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_paid: newStatus })
      });
      if (!res.ok) throw new Error("API Error");
    } catch (e) {
      console.error("Failed to update payment status:", e);
      setRsvpModal(prev => ({
        ...prev,
        rsvps: prev.rsvps.map(r => r.id === rsvpId ? { ...r, is_paid: currentStatus } : r)
      }));
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setPaymentFeedback(null);
      const text = await file.text();
      const parsedRows = parseCsvRows(text)
        .map((row) => row.map((cell) => String(cell || '').trim()))
        .filter((row) => row.some((cell) => normalizeValue(cell)));

      if (parsedRows.length < 2) {
        setPaymentFeedback({ type: 'error', text: 'CSV looks empty or has no payment rows.' });
        return;
      }

      const headers = parsedRows[0];
      const normalizedHeaders = headers.map((header) => normalizeCompact(header));

      const paymentStatusIdx = getHeaderIndex(normalizedHeaders, ['paymentstatus', 'status']);
      const studentNameIdx = getHeaderIndex(normalizedHeaders, ['nameofthestudent', 'studentname', 'name']);
      const emailIdx = getHeaderIndex(normalizedHeaders, ['email', 'studentemail']);
      const phoneIdx = getHeaderIndex(normalizedHeaders, ['phone', 'mobilenumber']);
      const yearIdx = getHeaderIndex(normalizedHeaders, ['yearofthestudent', 'year']);
      const departmentIdx = getHeaderIndex(normalizedHeaders, ['departmentofstudent', 'department', 'dept']);

      if (paymentStatusIdx === -1) {
        setPaymentFeedback({ type: 'error', text: 'CSV is missing payment status column.' });
        return;
      }

      const payments = [];
      let capturedRows = 0;
      let failedRows = 0;

      for (let i = 1; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const status = normalizeValue(row[paymentStatusIdx]);
        if (!status) continue;

        const isCaptured = ['captured', 'success', 'succeeded', 'paid'].includes(status);
        if (!isCaptured) {
          failedRows += 1;
          continue;
        }

        capturedRows += 1;

        const paymentName = studentNameIdx === -1 ? '' : row[studentNameIdx];
        const paymentEmail = emailIdx === -1 ? '' : row[emailIdx];
        const paymentPhone = phoneIdx === -1 ? '' : row[phoneIdx];
        const paymentYear = yearIdx === -1 ? '' : row[yearIdx];
        const paymentDepartment = departmentIdx === -1 ? '' : row[departmentIdx];

        payments.push({
          name: paymentName,
          nameKey: normalizeNameKey(paymentName),
          nameParts: nameParts(paymentName),
          email: normalizeValue(paymentEmail),
          phone: normalizeCompact(paymentPhone),
          year: normalizeYearLabel(paymentYear),
          department: normalizeDepartment(paymentDepartment),
          tokens: buildTokenSet(row),
        });
      }

      if (!payments.length) {
        setPaymentFeedback({
          type: 'error',
          text: `No captured/success payments found in CSV. Failed/pending rows: ${failedRows}.`,
        });
        return;
      }

      const usedPaymentIndexes = new Set();
      const idsToUpdate = [];
      let detailMismatchCount = 0;
      
      setRsvpModal((prev) => {
        const newRsvps = prev.rsvps.map((rsvp) => {
          if (rsvp.is_paid) return rsvp;

          const userData = rsvp.user || {};
          const currentYear = calculateYear(userData.batch);

          let bestPaymentIndex = -1;
          let bestMatch = null;

          payments.forEach((payment, paymentIndex) => {
            if (usedPaymentIndexes.has(paymentIndex)) return;

            const match = evaluatePaymentMatch(userData, payment, currentYear);
            if (!match.isMatch) return;

            if (!bestMatch || match.score > bestMatch.score) {
              bestMatch = match;
              bestPaymentIndex = paymentIndex;
            }
          });

          if (bestPaymentIndex !== -1 && bestMatch) {
            usedPaymentIndexes.add(bestPaymentIndex);
            idsToUpdate.push(rsvp.id);
            if (bestMatch.detailConflicts.length > 0) detailMismatchCount += 1;
            return { ...rsvp, is_paid: true };
          }

          return rsvp;
        });
        
        return { ...prev, rsvps: newRsvps };
      });
      
      if (idsToUpdate.length > 0) {
        const updateRes = await fetch(`${API}/api/rsvp/events/${rsvpModal.event.id}/bulk-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rsvp_ids: idsToUpdate, is_paid: true })
        });

        if (!updateRes.ok) throw new Error('Bulk payment update failed');

        const summary = [`Marked ${idsToUpdate.length} students as paid from CSV.`];
        summary.push(`Captured/success rows checked: ${capturedRows}.`);
        if (failedRows > 0) summary.push(`Ignored failed/pending rows: ${failedRows}.`);
        if (detailMismatchCount > 0) {
          summary.push(`Review suggested: ${detailMismatchCount} matched records had year/department differences.`);
        }

        setPaymentFeedback({ type: 'success', text: summary.join(' ') });
      } else {
        setPaymentFeedback({
          type: 'error',
          text: `No new student matches found from ${capturedRows} captured/success rows. Try including email or clearer student details in payment records.`,
        });
      }
    } catch (err) {
      console.error(err);
      setPaymentFeedback({ type: 'error', text: 'Failed to process CSV file.' });
    }
    
    e.target.value = null; // reset
  };

  const exportAttendanceCSV = () => {
    const rsvps = rsvpModal.rsvps || [];
    const attended = rsvps.filter(r => r.attended);
    if (!attended.length) {
      setRsvpError('No attendees selected for export.');
      return;
    }

    const yearRank = { IV: 4, III: 3, II: 2, I: 1, Alumni: 0, '-': -1 };
    const sortedAttended = [...attended].sort((a, b) => {
      const userA = a.user || {};
      const userB = b.user || {};

      const deptA = String(userA.department || '').trim().toLowerCase();
      const deptB = String(userB.department || '').trim().toLowerCase();
      const deptCompare = deptA.localeCompare(deptB);
      if (deptCompare !== 0) return deptCompare;

      const yearA = yearRank[calculateYear(userA.batch)] ?? -1;
      const yearB = yearRank[calculateYear(userB.batch)] ?? -1;
      if (yearA !== yearB) return yearB - yearA;

      const nameA = String(userA.name || '').trim();
      const nameB = String(userB.name || '').trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    setRsvpError('');
    const headers = ['S.NO', 'NAME', 'DEPARTMENT', 'YEAR', 'REGISTER NO'];
    const rows = sortedAttended.map((r, index) => {
      const u = r.user || {};
      return [
        index + 1,
        u.name || '-',
        u.department || '-',
        calculateYear(u.batch),
        u.register_number || '-'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const eventNameSafe = (rsvpModal.event?.title || 'event').replace(/\s+/g, '_');
    link.setAttribute('download', `${eventNameSafe}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || loadingData) return (
    <div className="min-h-dvh flex items-center justify-center bg-background-dark text-white">
      <div className="animate-pulse text-lg">Loading club dashboard...</div>
    </div>
  );

  // Stats
  const totalEvents = events.length;
  const totalRSVPs = events.reduce((sum, e) => sum + (e.rsvp_count || 0), 0);
  const totalAttended = events.reduce((sum, e) => sum + (e.attended_count || 0), 0);
  const attendanceRate = totalRSVPs > 0 ? Math.round((totalAttended / totalRSVPs) * 100) : 0;

  const sideNavItems = [
    { label: 'Dashboard', icon: 'dashboard', tab: 'dashboard' },
    { label: 'Event Management', icon: 'event', tab: 'events' },
  ];

  const clubIconUrl = getClubIconUrl(club);

  return (
    <div className="flex h-dvh w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 shrink-0 border-r border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
          <div className="flex items-center gap-3 mb-1">
            {clubIconUrl ? (
              <div className="size-10 rounded-full overflow-hidden shrink-0 border border-primary/20 bg-primary/5 flex items-center justify-center">
                <img src={clubIconUrl} alt={club?.name || 'Club'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-lg font-bold truncate block" title={club?.name || 'WAVC'}>
                {club?.name || 'WAVC'}
              </span>
              <p className="text-xs text-[#637588] dark:text-[#92adc9]">Club Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 sm:p-4 space-y-1">
          {sideNavItems.map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={cn(
                'touch-target flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === item.tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-[#637588] dark:text-[#92adc9] hover:bg-[#f0f2f4] dark:hover:bg-[#233648]',
              )}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="mt-auto shrink-0 border-t border-[#233648] bg-white dark:bg-[#111a22] p-3 sm:p-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/club/profile')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/club/profile');
              }
            }}
            className="w-full text-left flex items-center gap-3 rounded-xl p-2 hover:bg-[#233648] transition-colors cursor-pointer"
          >
            {user?.picture && user.picture.trim() !== '' ? (
              <img
                src={user.picture}
                alt={user?.name || 'Admin'}
                className="size-10 rounded-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #137fec 0%, #0d5bab 100%)', display: user?.picture && user.picture.trim() !== '' ? 'none' : 'flex' }}>
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-[#637588] dark:text-[#92adc9]">Head Administrator</p>
            </div>
            <button onClick={(event) => { event.stopPropagation(); logout(); }} aria-label="Sign out" className="touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors">
              <span className="material-symbols-outlined text-[20px] text-[#637588]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top bar */}
        <div className={`items-center justify-between px-4 lg:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] ${activeTab === 'events' ? 'flex lg:hidden' : 'flex'}`}>
          <div className="flex items-center gap-2 flex-1">
            <button aria-label="Open sidebar" className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            {activeTab !== 'events' && (
              <label className="flex items-stretch rounded-xl h-10 bg-[#f0f2f4] dark:bg-[#233648] md:min-w-75 w-full max-w-md">
                <div className="flex items-center justify-center pl-4"><span className="material-symbols-outlined text-[20px] text-[#637588]">search</span></div>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm px-3 focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1 w-full" placeholder="Search events..." />
              </label>
            )}
          </div>
        </div>

        {user && user.has_google_calendar_access === false && (
          <div className="mx-4 lg:mx-8 mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                Grant Google Calendar access only when needed for calendar-integrated admin actions.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = calendarConsentUrl;
                }}
                className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Connect Google Calendar
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {activeTab === 'events' ? (
          <div className="flex-1 overflow-hidden p-0">
            <ClubCalendar 
              club={club} 
              searchQuery={searchQuery} 
              onOpenEditModal={openEditModal} 
              onOpenCreateModal={(date) => { 
                setNewEvent({ ...EMPTY_EVENT_FORM, start_time: date, end_time: new Date(date.getTime() + 60*60*1000) }); 
                setNewPosterFile(null);
                setNewPosterPreview((previous) => {
                  if (previous) URL.revokeObjectURL(previous);
                  return '';
                });
                setCreateModalOpen(true); 
              }} 
            />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Event Management</h1>
              <p className="text-[#637588] dark:text-[#92adc9] mt-1">Create, edit, and track participation for club activities.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={() => document.getElementById('quickCreateTitle')?.focus()} className="touch-target flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[18px]">add</span> Create New Event
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            {[
              { label: 'Total Upcoming Events', value: totalEvents, icon: 'event_available', badge: `+${Math.min(totalEvents, 2)} this week`, color: 'primary' },
              { label: 'Total Active Registrations', value: totalRSVPs, icon: 'group', badge: '+15%', color: 'primary' },
              { label: 'Avg. Attendance Rate', value: `${attendanceRate}%`, icon: 'trending_up', badge: '+5%', color: 'primary' },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-[#1a2632] rounded-xl p-4 sm:p-6 border border-[#e5e7eb] dark:border-[#233648]">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10"><span className="material-symbols-outlined text-primary text-[24px]">{stat.icon}</span></div>
                  <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>{stat.badge}
                  </span>
                </div>
                <p className="text-sm text-[#637588] dark:text-[#92adc9] mb-1">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Events Table */}
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Upcoming Event Registration Tracker</h2>
              </div>
              {tableError && <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{tableError}</p>}
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-[#e5e7eb] dark:border-[#233648] overflow-hidden table-scroll">
                <table className="w-full min-w-180">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] dark:border-[#233648]">
                      {['Event Name', 'Category', 'Date', 'Registered', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#637588] italic">No events yet. Create your first event!</td></tr>
                    )}
                    {events.filter(e => eventMatchesSearch(e, searchQuery)).map(event => (
                      <tr key={event.id} className="border-b border-[#e5e7eb] dark:border-[#233648] hover:bg-[#f9fafb] dark:hover:bg-[#233648]/50 transition-colors">
                        <td className="px-4 py-3 cursor-pointer group" onClick={() => openRsvpModal(event)}>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-gray-700 bg-cover bg-center shrink-0" style={event.image_url ? { backgroundImage: `url("${event.image_url}")` } : {}}></div>
                            <div>
                              <p className="text-sm font-bold group-hover:text-primary transition-colors">{event.title}</p>
                              <p className="text-xs text-[#637588] dark:text-[#92adc9]">{event.location || 'No location'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${event.tag === 'TECH' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-400'}`}>
                            {event.tag || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{event.rsvp_count || 0}</span>
                            <div className="w-16 h-1.5 rounded-full bg-[#233648] overflow-hidden">
                              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(100, (event.rsvp_count || 0) / 2)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              aria-label={`Attendance QR for ${event.title}`}
                              onClick={() => openQrModal(event)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${event.attendance_qr_open ? 'bg-green-500/15 hover:bg-green-500/25' : 'hover:bg-[#233648]'}`}
                            >
                              <span className={`material-symbols-outlined text-[18px] ${event.attendance_qr_open ? 'text-green-500' : 'text-[#637588]'}`}>qr_code_2</span>
                            </button>
                            <button aria-label={`Edit ${event.title}`} onClick={() => openEditModal(event)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[18px] text-[#637588]">edit</span></button>
                            <button aria-label={`Delete ${event.title}`} onClick={() => setDeleteTarget(event)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-[18px] text-red-400">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Create */}
            <div>
              <h2 className="text-xl font-bold mb-4">Quick Create</h2>
              <form onSubmit={handleCreateEvent} className="bg-white dark:bg-[#1a2632] rounded-xl border border-[#e5e7eb] dark:border-[#233648] p-5 space-y-4">
                {createError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{createError}</p>}
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Title</label>
                  <input id="quickCreateTitle" type="text" required value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Winter Coding Bootcamp"
                    className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Short Description (max 100 words)</label>
                  <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the event..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] resize-none" />
                  <p className={`mt-1 text-xs ${isDescriptionTooLong(newEvent.description) ? 'text-red-500' : 'text-[#637588] dark:text-[#92adc9]'}`}>
                    {countWords(newEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Keywords (comma separated)</label>
                  <input type="text" value={newEvent.keywords} onChange={e => setNewEvent(p => ({ ...p, keywords: e.target.value }))}
                    placeholder="e.g. workshop, python, machine learning"
                    className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Date & Start</label>
                    <DatePicker
                      selected={newEvent.start_time}
                      onChange={(date) => setNewEvent((p) => ({ ...p, start_time: date }))}
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
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">End Time</label>
                    <DatePicker
                      selected={newEvent.end_time}
                      onChange={(date) => setNewEvent((p) => ({ ...p, end_time: date }))}
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
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-2 block">Category Tag</label>
                  <div className="flex gap-3">
                    {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map(tag => (
                      <button key={tag.value} type="button" onClick={() => setNewEvent(p => ({ ...p, tag: tag.value }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-all ${
                          newEvent.tag === tag.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#233648] text-[#92adc9] hover:border-[#34485c]'
                        }`}>
                        <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-2 block">Location</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                    <span className="material-symbols-outlined text-[18px] text-[#637588]">location_on</span>
                    <input type="text" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      placeholder="Add location"
                      className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Poster (JPEG/PNG/WebP, up to 2 MB after compression)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setPosterSelection(event.target.files?.[0] || null, setNewPosterFile, setNewPosterPreview, setCreateError)}
                    className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-semibold hover:file:bg-primary/20"
                  />
                  {newPosterPreview && (
                    <div className="mt-3 rounded-lg border border-[#e5e7eb] dark:border-[#233648] overflow-hidden">
                      <img src={newPosterPreview} alt="Poster preview" className="w-full h-40 object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="is_paid" checked={newEvent.is_paid || false} onChange={e => setNewEvent(p => ({ ...p, is_paid: e.target.checked }))} className="w-4 h-4 text-blue-500 bg-gray-100 dark:bg-[#1a2632] border-gray-300 dark:border-[#34485c] rounded-full focus:ring-blue-500 focus:ring-2 cursor-pointer" />
                  <label htmlFor="is_paid" className="text-sm font-medium text-[#111418] dark:text-white">Is this a paid event?</label>
                </div>
                
                {newEvent.is_paid && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Registration Fees</label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                        <span className="material-symbols-outlined text-[18px] text-[#637588]">payments</span>
                        <input type="text" value={newEvent.registration_fees || ""} onChange={e => setNewEvent(p => ({ ...p, registration_fees: e.target.value }))}
                          placeholder="e.g. ₹500"
                          className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Payment Link (Optional)</label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                        <span className="material-symbols-outlined text-[18px] text-[#637588]">link</span>
                        <input type="url" value={newEvent.payment_link || ""} onChange={e => setNewEvent(p => ({ ...p, payment_link: e.target.value }))}
                          placeholder="e.g. https://rzp.io/l/..."
                          className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                      </div>
                    </div>
                  </div>
                )}
                <button type="submit" disabled={creating || creatingPoster}
                  className="w-full py-3 rounded-xl bg-white dark:bg-[#233648] text-[#111418] dark:text-white font-bold text-sm border border-[#e5e7eb] dark:border-[#233648] hover:bg-[#f0f2f4] dark:hover:bg-[#34485c] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? 'Publishing...' : creatingPoster ? 'Uploading poster...' : 'Publish Event'}
                  {!(creating || creatingPoster) && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
        )}
      </main>
      {/* Create Event Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={() => { setCreateModalOpen(false); resetCreateEventForm(); }}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg border border-[#e5e7eb] dark:border-[#233648] overflow-y-auto modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
              <h2 className="text-xl font-bold">Create Event</h2>
              <button aria-label="Close create event dialog" onClick={() => { setCreateModalOpen(false); resetCreateEventForm(); }} className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              {createError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{createError}</p>}
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Title</label>
                <input type="text" required value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Winter Coding Bootcamp"
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Short Description (max 100 words)</label>
                <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the event..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] resize-none" />
                <p className={`mt-1 text-xs ${isDescriptionTooLong(newEvent.description) ? 'text-red-500' : 'text-[#637588] dark:text-[#92adc9]'}`}>
                  {countWords(newEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Keywords (comma separated)</label>
                <input type="text" value={newEvent.keywords} onChange={e => setNewEvent(p => ({ ...p, keywords: e.target.value }))}
                  placeholder="e.g. workshop, python, machine learning"
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Start Time</label>
                  <DatePicker
                    selected={newEvent.start_time}
                    onChange={(date) => setNewEvent((p) => ({ ...p, start_time: date }))}
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
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">End Time</label>
                  <DatePicker
                    selected={newEvent.end_time}
                    onChange={(date) => setNewEvent((p) => ({ ...p, end_time: date }))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Category</label>
                  <div className="flex bg-[#f0f2f4] dark:bg-[#233648] rounded-lg p-1">
                    {[
                      { value: 'TECH', label: 'Tech' },
                      { value: 'NON_TECH', label: 'Non-Tech' }
                    ].map(tag => (
                      <button type="button" key={tag.value} onClick={() => setNewEvent(p => ({ ...p, tag: tag.value }))}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          newEvent.tag === tag.value
                            ? 'bg-white dark:bg-[#34485c] text-[#111418] dark:text-white shadow-sm'
                            : 'text-[#637588] dark:text-[#92adc9] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}>
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Location</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                    <span className="material-symbols-outlined text-[18px] text-[#637588]">location_on</span>
                    <input type="text" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      placeholder="Add location"
                      className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Poster (JPEG/PNG/WebP, up to 2 MB after compression)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setPosterSelection(event.target.files?.[0] || null, setNewPosterFile, setNewPosterPreview, setCreateError)}
                  className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-semibold hover:file:bg-primary/20"
                />
                {newPosterPreview && (
                  <div className="mt-3 rounded-lg border border-[#e5e7eb] dark:border-[#233648] overflow-hidden">
                    <img src={newPosterPreview} alt="Poster preview" className="w-full h-40 object-cover" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="modal_is_paid" checked={newEvent.is_paid || false} onChange={e => setNewEvent(p => ({ ...p, is_paid: e.target.checked }))} className="w-4 h-4 text-blue-500 bg-gray-100 dark:bg-[#1a2632] border-gray-300 dark:border-[#34485c] rounded-full focus:ring-blue-500 focus:ring-2 cursor-pointer" />
                <label htmlFor="modal_is_paid" className="text-sm font-medium text-[#111418] dark:text-white">Is this a paid event?</label>
              </div>

              {newEvent.is_paid && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Registration Fees</label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                      <span className="material-symbols-outlined text-[18px] text-[#637588]">payments</span>
                      <input type="text" value={newEvent.registration_fees || ""} onChange={e => setNewEvent(p => ({ ...p, registration_fees: e.target.value }))}
                        placeholder="e.g. ₹500"
                        className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Payment Link (Optional)</label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648]">
                      <span className="material-symbols-outlined text-[18px] text-[#637588]">link</span>
                      <input type="url" value={newEvent.payment_link || ""} onChange={e => setNewEvent(p => ({ ...p, payment_link: e.target.value }))}
                        placeholder="e.g. https://rzp.io/l/..."
                        className="bg-transparent border-none text-sm focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] flex-1" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setCreateModalOpen(false); resetCreateEventForm(); }} className="px-4 py-2 rounded-xl text-sm font-bold text-[#637588] dark:text-[#92adc9] hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">Cancel</button>
                <button type="submit" disabled={creating || creatingPoster} className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {creating ? 'Saving...' : creatingPoster ? 'Uploading poster...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Event Modal */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={() => setEditEvent(null)}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg border border-[#e5e7eb] dark:border-[#233648] overflow-y-auto modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
              <h2 className="text-xl font-bold">Edit Event</h2>
              <button aria-label="Close edit event dialog" onClick={() => setEditEvent(null)} className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <form onSubmit={handleUpdateEvent} className="p-6 space-y-4">
              {editError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{editError}</p>}
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Event Title</label>
                <input type="text" required value={editEvent.title} onChange={e => setEditEvent(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Short Description (max 100 words)</label>
                <textarea value={editEvent.description} onChange={e => setEditEvent(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white resize-none" />
                <p className={`mt-1 text-xs ${isDescriptionTooLong(editEvent.description) ? 'text-red-500' : 'text-[#637588] dark:text-[#92adc9]'}`}>
                  {countWords(editEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Keywords (comma separated)</label>
                <input type="text" value={editEvent.keywords} onChange={e => setEditEvent(p => ({ ...p, keywords: e.target.value }))}
                  placeholder="e.g. workshop, python, machine learning"
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Start Time</label>
                  <DatePicker
                    selected={editEvent.start_time}
                    onChange={(date) => setEditEvent((p) => ({ ...p, start_time: date }))}
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
                  <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">End Time</label>
                  <DatePicker
                    selected={editEvent.end_time}
                    onChange={(date) => setEditEvent((p) => ({ ...p, end_time: date }))}
                    showTimeInput
                    dateFormat="dd MMM yyyy, h:mm aa"
                    placeholderText="Select end date and time"
                    minDate={editEvent.start_time || undefined}
                    className="modern-datetime-input w-full"
                    calendarClassName="modern-datepicker-calendar"
                    popperClassName="modern-datepicker-popper"
                    popperPlacement="bottom-start"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Location</label>
                <input type="text" value={editEvent.location} onChange={e => setEditEvent(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="edit_is_paid" checked={editEvent.is_paid || false} onChange={e => setEditEvent(p => ({ ...p, is_paid: e.target.checked }))} className="w-4 h-4 text-blue-500 bg-gray-100 dark:bg-[#1a2632] border-gray-300 dark:border-[#34485c] rounded-full focus:ring-blue-500 focus:ring-2 cursor-pointer" />
                <label htmlFor="edit_is_paid" className="text-sm font-medium text-[#111418] dark:text-white">Is this a paid event?</label>
              </div>

              {editEvent.is_paid && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Registration Fees</label>
                    <input type="text" value={editEvent.registration_fees || ""} onChange={e => setEditEvent(p => ({ ...p, registration_fees: e.target.value }))}
                      placeholder="e.g. ₹500"
                      className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Payment Link (Optional)</label>
                    <input type="url" value={editEvent.payment_link || ""} onChange={e => setEditEvent(p => ({ ...p, payment_link: e.target.value }))}
                      placeholder="e.g. https://rzp.io/l/..."
                      className="w-full px-3 py-2 rounded-lg bg-[#f0f2f4] dark:bg-[#233648] border-none text-sm focus:ring-2 focus:ring-primary focus:outline-none text-[#111418] dark:text-white" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-2 block">Category</label>
                <div className="flex gap-3">
                  {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map(tag => (
                    <button key={tag.value} type="button" onClick={() => setEditEvent(p => ({ ...p, tag: tag.value }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        editEvent.tag === tag.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[#e5e7eb] dark:border-[#233648] text-[#637588] dark:text-[#92adc9] hover:border-[#637588]'
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#637588] dark:text-[#92adc9] mb-1 block">Replace Event Poster (optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setPosterSelection(event.target.files?.[0] || null, setEditPosterFile, setEditPosterPreview, setEditError)}
                  className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-semibold hover:file:bg-primary/20"
                />
                {editPosterPreview ? (
                  <div className="mt-3 rounded-lg border border-[#e5e7eb] dark:border-[#233648] overflow-hidden">
                    <img src={editPosterPreview} alt="Updated poster preview" className="w-full h-40 object-cover" />
                  </div>
                ) : editEvent.image_url ? (
                  <div className="mt-3 rounded-lg border border-[#e5e7eb] dark:border-[#233648] overflow-hidden">
                    <img src={editEvent.image_url} alt="Current poster" className="w-full h-40 object-cover" />
                  </div>
                ) : null}
                {editEvent.image_url && !editPosterFile && (
                  <button
                    type="button"
                    onClick={() => setEditEvent((previous) => ({ ...previous, image_url: '' }))}
                    className="mt-2 text-xs font-semibold text-red-500 hover:text-red-400"
                  >
                    Remove existing poster
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditEvent(null)} className="flex-1 py-3 rounded-xl border border-[#e5e7eb] dark:border-[#233648] text-sm font-bold hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editing || editingPoster}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {editing ? 'Saving...' : editingPoster ? 'Uploading poster...' : 'Save Changes'}
                  {!(editing || editingPoster) && <span className="material-symbols-outlined text-[18px]">check</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={closeQrModal}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg border border-[#e5e7eb] dark:border-[#233648] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#e5e7eb] dark:border-[#233648]">
              <div>
                <h2 className="text-lg font-bold">Attendance QR</h2>
                <p className="text-xs text-[#637588] dark:text-[#92adc9] mt-1">{qrModal.event?.title || 'Event'}</p>
              </div>
              <button aria-label="Close attendance QR dialog" onClick={closeQrModal} className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="rounded-xl border border-[#e5e7eb] dark:border-[#233648] p-3 bg-[#f9fafb] dark:bg-[#111a22] text-sm flex items-center justify-between">
                <span className="text-[#637588] dark:text-[#92adc9]">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${qrModal.event?.attendance_qr_open ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-slate-500/15 text-[#637588] dark:text-[#92adc9]'}`}>
                  {qrModal.event?.attendance_qr_open ? 'OPEN' : 'CLOSED'}
                </span>
              </div>

              {qrModal.error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{qrModal.error}</p>}
              {qrModal.notice && <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">{qrModal.notice}</p>}

              <div className="rounded-xl border border-[#e5e7eb] dark:border-[#233648] p-4 flex items-center justify-center min-h-72 bg-white dark:bg-[#1a2632]">
                {qrModal.loading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                ) : qrModal.checkinUrl ? (
                  <QRCodeSVG value={qrModal.checkinUrl} size={240} bgColor="#ffffff" fgColor="#111418" includeMargin />
                ) : (
                  <p className="text-sm text-[#637588] dark:text-[#92adc9]">QR will appear here.</p>
                )}
              </div>

              {qrModal.checkinUrl && (
                <div className="rounded-xl border border-[#e5e7eb] dark:border-[#233648] p-3 bg-[#f9fafb] dark:bg-[#111a22]">
                  <p className="text-xs text-[#637588] dark:text-[#92adc9] mb-2">Attendance link</p>
                  <p className="text-xs font-mono break-all text-slate-700 dark:text-slate-200">{qrModal.checkinUrl}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => toggleQrAttendance(true)}
                  disabled={qrModal.loading}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/15 text-green-700 dark:text-green-400 text-sm font-bold hover:bg-green-600/25 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Open QR
                </button>
                <button
                  onClick={() => toggleQrAttendance(false)}
                  disabled={qrModal.loading}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/15 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-600/25 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">stop</span>
                  Close QR
                </button>
                <button
                  onClick={copyQrLink}
                  disabled={qrModal.loading || !qrModal.checkinUrl}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RSVP / Attendance Modal */}
      {rsvpModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={() => setRsvpModal({ open: false, event: null, rsvps: [], loading: false })}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-4xl border border-[#e5e7eb] dark:border-[#233648] flex flex-col modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-[#e5e7eb] dark:border-[#233648] gap-4">
              <div>
                <h2 className="text-xl font-bold">{rsvpModal.event?.title || "Event"} - Attendees</h2>
                <p className="text-xs text-[#637588] dark:text-[#92adc9] mt-1">{rsvpModal.rsvps.length} Students Registered</p>
              </div>
              
              {rsvpModal.event?.is_paid && (
                <div className="flex bg-[#f0f2f4] dark:bg-[#233648] p-1 rounded-xl w-full sm:w-auto">
                    <button 
                      onClick={() => setRsvpModal(p => ({ ...p, tab: "attendance" }))} 
                      className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors ${rsvpModal.tab !== "payment" ? "bg-white dark:bg-[#1a2632] shadow-sm text-primary" : "text-[#637588] dark:text-[#92adc9] hover:text-[#111418] hover:dark:text-white"}`}>
                      Student OD
                    </button>
                    <button 
                      onClick={() => setRsvpModal(p => ({ ...p, tab: "payment" }))} 
                      className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors ${rsvpModal.tab === "payment" ? "bg-white dark:bg-[#1a2632] shadow-sm text-primary" : "text-[#637588] dark:text-[#92adc9] hover:text-[#111418] hover:dark:text-white"}`}>
                      Payments
                    </button>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <button onClick={exportAttendanceCSV} disabled={rsvpModal.loading || rsvpModal.rsvps.length === 0} className="touch-target flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/10 text-green-600 dark:text-green-400 text-sm font-bold hover:bg-green-600/20 transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                </button>
                <button aria-label="Close attendees dialog" onClick={() => setRsvpModal({ open: false, event: null, rsvps: [], loading: false })} className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {rsvpModal.loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : rsvpModal.rsvps.length === 0 ? (
                <div className="text-center py-12 text-[#637588] dark:text-[#92adc9]">No students have registered for this event yet.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {rsvpModal.tab === "payment" && rsvpModal.event?.is_paid && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
                      <div className="text-sm text-[#637588]">Upload payment CSV to auto-match captured/success rows using name, email, register no, year and department.</div>
                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">upload_file</span> Upload CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                        </label>
                    </div>
                  )}
                  {paymentFeedback && (
                    <p className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      paymentFeedback.type === 'success'
                        ? 'border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'border border-red-500/30 bg-red-500/10 text-red-500',
                    )}>
                      {paymentFeedback.text}
                    </p>
                  )}
                  {rsvpError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{rsvpError}</p>}

                  <div className="border border-[#e5e7eb] dark:border-[#233648] rounded-xl overflow-hidden table-scroll">
                    <table className="w-full min-w-205 text-sm text-left">
                      <thead className="bg-[#f9fafb] dark:bg-[#111a22] text-xs uppercase text-[#637588] dark:text-[#92adc9] font-bold border-b border-[#e5e7eb] dark:border-[#233648]">
                        <tr>
                          <th className="px-4 py-3">S.NO</th>
                          <th className="px-4 py-3">NAME</th>
                          <th className="px-4 py-3">DEPARTMENT</th>
                          <th className="px-4 py-3">YEAR</th>
                          <th className="px-4 py-3">REGISTER NO</th>
                          {rsvpModal.tab !== "payment" && (
                            <th className="px-4 py-3">ATTENDANCE MARKED AT</th>
                          )}
                          <th className="px-4 py-3 text-center border-l border-[#e5e7eb] dark:border-[#233648]">
                              {rsvpModal.tab === "payment" ? "PAID" : "ATTENDED"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#233648]">
                        {rsvpModal.rsvps.map((rsvp, index) => {
                          const u = rsvp.user || {};
                          return (
                            <tr key={rsvp.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#233648]/30 transition-colors">
                              <td className="px-4 py-3 font-medium">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{u.name || "-"}</td>
                              <td className="px-4 py-3">{u.department || "-"}</td>
                              <td className="px-4 py-3">{calculateYear(u.batch)}</td>
                              <td className="px-4 py-3 font-mono text-xs">{u.register_number || "-"}</td>
                              {rsvpModal.tab !== "payment" && (
                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                  {formatAttendanceMarkedAt(rsvp.attended_marked_at)}
                                </td>
                              )}
                              <td className="px-4 py-3 text-center border-l border-[#e5e7eb] dark:border-[#233648]">
                                {rsvpModal.tab === "payment" ? (
                                    <input 
                                      type="checkbox" 
                                      checked={rsvp.is_paid || false}
                                      onChange={() => handleTogglePayment(rsvp.id, rsvp.is_paid)}
                                      className="w-5 h-5 rounded border-[#e5e7eb] dark:border-[#34485c] text-primary focus:ring-primary dark:bg-[#1a2632] cursor-pointer"
                                    />
                                ) : (
                                    <input 
                                      type="checkbox" 
                                      checked={rsvp.attended || false}
                                      onChange={() => handleToggleAttendance(rsvp.id, rsvp.attended)}
                                      className="w-5 h-5 rounded border-[#e5e7eb] dark:border-[#34485c] text-primary focus:ring-primary dark:bg-[#1a2632] cursor-pointer"
                                    />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.title || 'this event'} and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEvent}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClubDashboard;
