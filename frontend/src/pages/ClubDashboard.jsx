import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import DatePicker from 'react-datepicker';
import imageCompression from 'browser-image-compression';
import 'react-datepicker/dist/react-datepicker.css';
import { QRCodeSVG } from 'qrcode.react';
import ClubCalendar from './ClubCalendar';
import { getClubIconUrl, getClubInitial } from '../lib/utils';
import ClubDashboardSidebar from '../components/club-dashboard/ClubDashboardSidebar';
import ClubDashboardTopBar from '../components/club-dashboard/ClubDashboardTopBar';
import AppShell from '../components/layout/AppShell';
import FollowersTab from '../components/club-dashboard/FollowersTab';
import ClubMembersTab from '../components/club-dashboard/ClubMembersTab';
import CreateEventTab from '../components/club-dashboard/CreateEventTab';
import EventManagementTab from '../components/club-dashboard/EventManagementTab';
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
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { EventPosterFallback } from '../components/ui/event-poster-fallback';
import { FieldMessage } from '../components/ui/field-message';
import { IconButton } from '../components/ui/icon-button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/ui/status-badge';
import { Textarea } from '../components/ui/textarea';
import { Toast } from '../components/ui/toast';

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

const STUDENT_DEPARTMENT_OPTIONS = [
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Artificial Intelligence and Data Science',
  'Computer Science and Engineering',
  'Computer Science and Engineering (Internet of Things)',
  'Computer Science and Engineering (Cyber Security)',
  'Electrical and Electronics Engineering',
  'ECE',
  'ECE (VLSI Design and Technology)',
  'IT',
  'Mechanical Engineering',
];

const STUDENT_YEAR_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'Alumni'];

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

  if (/\b(v|5|5th|fifth)\b/.test(raw)) return 'V';
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
  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersError, setFollowersError] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [memberActionError, setMemberActionError] = useState('');
  const [memberActionSuccess, setMemberActionSuccess] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDepartmentFilter, setMemberDepartmentFilter] = useState('');
  const [memberYearFilter, setMemberYearFilter] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [isCreatePosterDragActive, setIsCreatePosterDragActive] = useState(false);
  const newPosterInputRef = useRef(null);
  const createPosterDragCounterRef = useRef(0);

  // Edit Modal
  const [editEvent, setEditEvent] = useState(null);
  const [editPosterFile, setEditPosterFile] = useState(null);
  const [editPosterPreview, setEditPosterPreview] = useState('');
  const [editing, setEditing] = useState(false);
  const [editingPoster, setEditingPoster] = useState(false);
  const [isEditPosterDragActive, setIsEditPosterDragActive] = useState(false);
  const editPosterInputRef = useRef(null);
  const editPosterDragCounterRef = useRef(0);

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

  const openCreatePosterPicker = () => {
    newPosterInputRef.current?.click();
  };

  const openEditPosterPicker = () => {
    editPosterInputRef.current?.click();
  };

  const handlePosterDragEnter = (event, setDragActive, dragCounterRef) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    setDragActive(true);
  };

  const handlePosterDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handlePosterDragLeave = (event, setDragActive, dragCounterRef) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setDragActive(false);
    }
  };

  const handlePosterDrop = (event, setDragActive, dragCounterRef, setFile, setPreview, setError) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0] || null;
    setPosterSelection(droppedFile, setFile, setPreview, setError);
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
    createPosterDragCounterRef.current = 0;
    setIsCreatePosterDragActive(false);
    if (newPosterInputRef.current) {
      newPosterInputRef.current.value = '';
    }
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
        setFollowersLoading(true);
        setFollowersError('');
        setMembersLoading(true);
        setMembersError('');

        const [eventsRes, followersRes, membersRes] = await Promise.all([
          fetch(`${API}/api/clubs/${myClub.id}/events`),
          fetch(`${API}/api/follow/clubs/${myClub.id}/followers`),
          fetch(`${API}/api/clubs/${myClub.id}/members`),
        ]);

        if (eventsRes.ok) {
          setEvents(await eventsRes.json());
        } else {
          setEvents([]);
        }

        if (followersRes.ok) {
          const followersPayload = await followersRes.json();
          setFollowers(Array.isArray(followersPayload.followers) ? followersPayload.followers : []);
        } else {
          setFollowers([]);
          setFollowersError('Could not load followers right now.');
        }

        if (membersRes.ok) {
          const membersPayload = await membersRes.json();
          setMembers(Array.isArray(membersPayload.members) ? membersPayload.members : []);
        } else {
          setMembers([]);
          setMembersError('Could not load club members right now.');
        }

        setFollowersLoading(false);
        setMembersLoading(false);
      }
    } catch (err) { console.error(err); }
    finally {
      setFollowersLoading(false);
      setMembersLoading(false);
      setLoadingData(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user && user.role !== 'CLUB_ADMIN') { navigate('/student/dashboard'); return; }
    if (user) void fetchData();
  }, [user, loading, navigate, fetchData]);

  const openAddMemberModal = () => {
    setAddMemberOpen(true);
    setMemberActionError('');
    setMemberActionSuccess('');
  };

  const closeAddMemberModal = () => {
    setAddMemberOpen(false);
    setMemberSearch('');
    setMemberDepartmentFilter('');
    setMemberYearFilter('');
    setStudentResults([]);
    setStudentsError('');
  };

  useEffect(() => {
    if (!addMemberOpen || !club?.id) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setStudentsLoading(true);
      setStudentsError('');

      try {
        const params = new URLSearchParams();
        params.set('exclude_club_id', String(club.id));

        const trimmedSearch = memberSearch.trim();
        if (trimmedSearch) params.set('q', trimmedSearch);
        if (memberDepartmentFilter) params.set('department', memberDepartmentFilter);
        if (memberYearFilter) params.set('year', memberYearFilter);

        const response = await fetch(`${API}/api/users/students?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail || 'Failed to load registered students.');
        }

        const payload = await response.json();
        setStudentResults(Array.isArray(payload.students) ? payload.students : []);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setStudentResults([]);
        setStudentsError(err?.message || 'Failed to load registered students.');
      } finally {
        setStudentsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [addMemberOpen, club, memberSearch, memberDepartmentFilter, memberYearFilter]);

  const handleAddMember = async (studentId) => {
    if (!club?.id) return;

    setMemberActionError('');
    setMemberActionSuccess('');

    try {
      const response = await fetch(`${API}/api/clubs/${club.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: studentId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to add club member.');
      }

      setMemberActionSuccess('Member added successfully.');
      setStudentResults((prev) => prev.filter((student) => student.id !== studentId));
      await fetchData();
    } catch (err) {
      setMemberActionError(err?.message || 'Failed to add club member.');
    }
  };

  const handleRemoveMember = async (member) => {
    if (!club?.id) return;

    const memberName = member?.name || member?.email || 'this member';
    const confirmed = window.confirm(`Remove ${memberName} from club members?`);
    if (!confirmed) return;

    setMemberActionError('');
    setMemberActionSuccess('');

    try {
      const response = await fetch(`${API}/api/clubs/${club.id}/members/${member.user_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to remove club member.');
      }

      setMemberActionSuccess('Member removed successfully.');
      await fetchData();
    } catch (err) {
      setMemberActionError(err?.message || 'Failed to remove club member.');
    }
  };

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
        setActiveTab('dashboard');
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
    editPosterDragCounterRef.current = 0;
    setIsEditPosterDragActive(false);
    if (editPosterInputRef.current) {
      editPosterInputRef.current.value = '';
    }
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
        editPosterDragCounterRef.current = 0;
        setIsEditPosterDragActive(false);
        if (editPosterInputRef.current) {
          editPosterInputRef.current.value = '';
        }
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

  const [rsvpModal, setRsvpModal] = useState({
    open: false,
    event: null,
    rsvps: [],
    workforce: [],
    loading: false,
    workforceLoading: false,
    tab: 'team',
  });
  const [workforceActionError, setWorkforceActionError] = useState('');
  const [workforceActionSuccess, setWorkforceActionSuccess] = useState('');
  const [workforceMemberUserId, setWorkforceMemberUserId] = useState('');
  const [workforceVolunteerQuery, setWorkforceVolunteerQuery] = useState('');
  const [workforceVolunteerResults, setWorkforceVolunteerResults] = useState([]);
  const [workforceVolunteerLoading, setWorkforceVolunteerLoading] = useState(false);
  const [workforceVolunteerError, setWorkforceVolunteerError] = useState('');
  const [qrModal, setQrModal] = useState({
    open: false,
    event: null,
    loading: false,
    checkinUrl: '',
    error: '',
    notice: '',
  });

  const getDegreeDuration = (degreeStr) => {
    const normalizedDegree = normalizeCompact(degreeStr);
    if (!normalizedDegree) return null;

    if (normalizedDegree.includes('mtech') && normalizedDegree.includes('integrated')) {
      return 5;
    }
    if (normalizedDegree === 'be' || normalizedDegree.includes('btech')) {
      return 4;
    }
    if (normalizedDegree === 'me' || normalizedDegree.includes('mtech')) {
      return 2;
    }

    return null;
  };

  const getAdmissionYearFromRegisterNumber = (registerNumber) => {
    const digitsOnly = String(registerNumber || '').replace(/\D/g, '');
    if (digitsOnly.length < 6) return null;

    // SSN register numbers usually encode admission year as the 5th and 6th digits.
    const admissionYearCode = parseInt(digitsOnly.slice(4, 6), 10);
    if (Number.isNaN(admissionYearCode)) return null;

    return 2000 + admissionYearCode;
  };

  const calculateYearFromAdmission = (admissionYear, duration, currentYear) => {
    if (!admissionYear || !duration) return null;

    // Year progression aligns with academic year rollover, so currentYear - admissionYear
    // maps 2024 intake to II in 2026.
    let yearNumber = currentYear - admissionYear;
    if (yearNumber <= 0) yearNumber = 1;

    if (yearNumber > duration) return 'Alumni';

    const romanYears = ['', 'I', 'II', 'III', 'IV', 'V'];
    return romanYears[yearNumber] || '-';
  };

  const calculateYear = (batchStr, degreeStr, registerNumber) => {
    const duration = getDegreeDuration(degreeStr);
    if (!duration) return '-';

    const currentYear = new Date().getFullYear();

    const admissionYear = getAdmissionYearFromRegisterNumber(registerNumber);
    const yearFromRegister = calculateYearFromAdmission(admissionYear, duration, currentYear);
    if (yearFromRegister) return yearFromRegister;

    if (!batchStr) return '-';
    const passout = parseInt(batchStr, 10);
    if (isNaN(passout)) return '-';

    const diff = passout - currentYear;
    if (diff < 0) return 'Alumni';

    const yearNumber = duration - diff;
    if (yearNumber < 1 || yearNumber > duration) return '-';

    const romanYears = ['', 'I', 'II', 'III', 'IV', 'V'];
    return romanYears[yearNumber] || '-';
  };

  const closeRsvpModal = () => {
    setRsvpModal({
      open: false,
      event: null,
      rsvps: [],
      workforce: [],
      loading: false,
      workforceLoading: false,
      tab: 'team',
    });
    setWorkforceActionError('');
    setWorkforceActionSuccess('');
    setWorkforceMemberUserId('');
    setWorkforceVolunteerQuery('');
    setWorkforceVolunteerResults([]);
    setWorkforceVolunteerError('');
    setWorkforceVolunteerLoading(false);
    setRsvpError('');
    setPaymentFeedback(null);
  };

  const sortWorkforce = (workforceList) => {
    return [...workforceList].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'CLUB_MEMBER' ? -1 : 1;
      }
      const leftName = String(left.name || left.email || '').toLowerCase();
      const rightName = String(right.name || right.email || '').toLowerCase();
      return leftName.localeCompare(rightName);
    });
  };

  const openRsvpModal = async (eventObj, initialTab = 'team') => {
    setRsvpError('');
    setPaymentFeedback(null);
    setWorkforceActionError('');
    setWorkforceActionSuccess('');
    setWorkforceMemberUserId('');
    setWorkforceVolunteerQuery('');
    setWorkforceVolunteerResults([]);
    setWorkforceVolunteerError('');
    setRsvpModal({
      open: true,
      event: eventObj,
      rsvps: [],
      workforce: [],
      loading: true,
      workforceLoading: true,
      tab: initialTab,
    });

    try {
      const [rsvpRes, workforceRes] = await Promise.all([
        fetch(`${API}/api/rsvp/events/${eventObj.id}/rsvps`),
        fetch(`${API}/api/events/${eventObj.id}/workforce`),
      ]);

      const rsvps = rsvpRes.ok ? (await rsvpRes.json()).rsvps || [] : [];
      const workforce = workforceRes.ok ? sortWorkforce((await workforceRes.json()).workers || []) : [];

      setRsvpModal(prev => ({
        ...prev,
        rsvps,
        workforce,
        loading: false,
        workforceLoading: false,
      }));
    } catch {
      setRsvpModal(prev => ({ ...prev, loading: false, workforceLoading: false }));
    }
  };

  const openOdSheet = (eventObj) => {
    void openRsvpModal(eventObj, 'attendance');
  };

  const handleAddEventWorker = async (userId, role) => {
    if (!rsvpModal.event || !userId) return;

    setWorkforceActionError('');
    setWorkforceActionSuccess('');

    try {
      const response = await fetch(`${API}/api/events/${rsvpModal.event.id}/workforce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(userId), role }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to assign worker.');
      }

      const assignedWorker = await response.json();
      setRsvpModal((prev) => ({
        ...prev,
        workforce: sortWorkforce([...prev.workforce, assignedWorker]),
      }));
      setWorkforceActionSuccess(role === 'CLUB_MEMBER' ? 'Club member assigned to event.' : 'Volunteer assigned to event.');

      if (role === 'CLUB_MEMBER') {
        setWorkforceMemberUserId('');
      }
    } catch (err) {
      setWorkforceActionError(err?.message || 'Failed to assign worker.');
    }
  };

  const handleRemoveEventWorker = async (worker) => {
    if (!rsvpModal.event) return;

    const workerName = worker?.name || worker?.email || 'this user';
    const confirmed = window.confirm(`Remove ${workerName} from this event?`);
    if (!confirmed) return;

    setWorkforceActionError('');
    setWorkforceActionSuccess('');

    try {
      const response = await fetch(`${API}/api/events/${rsvpModal.event.id}/workforce/${worker.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to remove worker.');
      }

      setRsvpModal((prev) => ({
        ...prev,
        workforce: prev.workforce.filter((entry) => entry.id !== worker.id),
      }));
      setWorkforceActionSuccess('Worker removed from event.');
    } catch (err) {
      setWorkforceActionError(err?.message || 'Failed to remove worker.');
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
          const currentYear = calculateYear(userData.batch, userData.degree, userData.register_number);

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

    const yearRank = { V: 5, IV: 4, III: 3, II: 2, I: 1, Alumni: 0, '-': -1 };
    const sortedAttended = [...attended].sort((a, b) => {
      const userA = a.user || {};
      const userB = b.user || {};

      const deptA = String(userA.department || '').trim().toLowerCase();
      const deptB = String(userB.department || '').trim().toLowerCase();
      const deptCompare = deptA.localeCompare(deptB);
      if (deptCompare !== 0) return deptCompare;

      const yearA = yearRank[calculateYear(userA.batch, userA.degree, userA.register_number)] ?? -1;
      const yearB = yearRank[calculateYear(userB.batch, userB.degree, userB.register_number)] ?? -1;
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
        calculateYear(u.batch, u.degree, u.register_number),
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

  useEffect(() => {
    if (!rsvpModal.open || rsvpModal.tab !== 'team') return;

    const query = workforceVolunteerQuery.trim();
    if (!query) {
      setWorkforceVolunteerResults([]);
      setWorkforceVolunteerError('');
      setWorkforceVolunteerLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setWorkforceVolunteerLoading(true);
      setWorkforceVolunteerError('');
      try {
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('limit', '50');

        const response = await fetch(`${API}/api/users/students?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail || 'Failed to load volunteer candidates.');
        }

        const payload = await response.json();
        setWorkforceVolunteerResults(Array.isArray(payload.students) ? payload.students : []);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setWorkforceVolunteerResults([]);
        setWorkforceVolunteerError(err?.message || 'Failed to load volunteer candidates.');
      } finally {
        setWorkforceVolunteerLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [rsvpModal.open, rsvpModal.tab, workforceVolunteerQuery]);

  const assignedEventWorkerUserIds = useMemo(() => {
    return new Set((rsvpModal.workforce || []).map((worker) => worker.user_id));
  }, [rsvpModal.workforce]);

  const availableClubMembersForEvent = useMemo(() => {
    return members.filter((member) => !assignedEventWorkerUserIds.has(member.user_id));
  }, [members, assignedEventWorkerUserIds]);

  const volunteerCandidateResults = useMemo(() => {
    return workforceVolunteerResults.filter((student) => !assignedEventWorkerUserIds.has(student.id));
  }, [workforceVolunteerResults, assignedEventWorkerUserIds]);

  const memberDepartmentOptions = useMemo(() => {
    const values = new Set(STUDENT_DEPARTMENT_OPTIONS);
    studentResults.forEach((student) => {
      const department = String(student.department || '').trim();
      if (department) values.add(department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [studentResults]);

  if (loading || loadingData) return (
    <div className="flex min-h-dvh items-center justify-center bg-background-dark text-white">
      <div className="animate-pulse text-lg">Loading club dashboard...</div>
    </div>
  );

  // Stats
  const totalEvents = events.length;
  const totalRSVPs = events.reduce((sum, e) => sum + (e.rsvp_count || 0), 0);
  const totalAttended = events.reduce((sum, e) => sum + (e.attended_count || 0), 0);
  const attendanceRate = totalRSVPs > 0 ? Math.round((totalAttended / totalRSVPs) * 100) : 0;

  const sideNavItems = [
    { label: 'Event Management', icon: 'dashboard', tab: 'dashboard' },
    { label: 'Followers', icon: 'groups', tab: 'followers' },
    { label: 'Club Members', icon: 'group_add', tab: 'members' },
    { label: 'Event Calendar', icon: 'event', tab: 'events' },
    { label: 'Create Event', icon: 'add_circle', tab: 'create-event' },
  ];

  const clubIconUrl = getClubIconUrl(club);
  const clubInitial = getClubInitial(club);

  const sidebarNode = (
    <ClubDashboardSidebar
      mobileMenuOpen={mobileMenuOpen}
      sideNavItems={sideNavItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      setMobileMenuOpen={setMobileMenuOpen}
      club={club}
      clubIconUrl={clubIconUrl}
      clubInitial={clubInitial}
      user={user}
      navigate={navigate}
      logout={logout}
    />
  );

  const topBarNode = (
    <ClubDashboardTopBar
      activeTab={activeTab}
      setMobileMenuOpen={setMobileMenuOpen}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );

  return (
    <AppShell sidebar={sidebarNode} topbar={topBarNode} mobileMenuOpen={mobileMenuOpen} onCloseMenu={() => setMobileMenuOpen(false)}>
      <div className="relative flex h-full w-full flex-col overflow-hidden font-body text-text-primary dark:text-white">
        <div className="pointer-events-none absolute inset-0 opacity-55">
          <div className="atmosphere-grid"></div>
        </div>

        {user && user.has_google_calendar_access === false && (
          <div className="relative mx-4 mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 shadow-soft-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 lg:mx-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                Grant Google Calendar access only when needed for calendar-integrated admin actions.
              </p>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 text-xs text-white hover:bg-amber-700"
                onClick={() => {
                  window.location.href = calendarConsentUrl;
                }}
              >
                Connect Google Calendar
              </Button>
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
                createPosterDragCounterRef.current = 0;
                setIsCreatePosterDragActive(false);
                if (newPosterInputRef.current) {
                  newPosterInputRef.current.value = '';
                }
                setNewPosterFile(null);
                setNewPosterPreview((previous) => {
                  if (previous) URL.revokeObjectURL(previous);
                  return '';
                });
                setCreateError('');
                setActiveTab('create-event');
              }} 
            />
          </div>
        ) : activeTab === 'followers' ? (
          <FollowersTab
            followers={followers}
            followersLoading={followersLoading}
            followersError={followersError}
            calculateYear={calculateYear}
          />
        ) : activeTab === 'members' ? (
          <ClubMembersTab
            members={members}
            membersLoading={membersLoading}
            membersError={membersError}
            calculateYear={calculateYear}
            memberActionError={memberActionError}
            memberActionSuccess={memberActionSuccess}
            onOpenAddMember={openAddMemberModal}
            onRemoveMember={handleRemoveMember}
            addMemberOpen={addMemberOpen}
            onCloseAddMember={closeAddMemberModal}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            memberDepartmentFilter={memberDepartmentFilter}
            setMemberDepartmentFilter={setMemberDepartmentFilter}
            memberYearFilter={memberYearFilter}
            setMemberYearFilter={setMemberYearFilter}
            studentResults={studentResults}
            studentsLoading={studentsLoading}
            studentsError={studentsError}
            onAddMember={handleAddMember}
            memberDepartmentOptions={memberDepartmentOptions}
            studentYearOptions={STUDENT_YEAR_OPTIONS}
          />
        ) : activeTab === 'create-event' ? (
          <CreateEventTab
            createError={createError}
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            handleCreateEvent={handleCreateEvent}
            creating={creating}
            creatingPoster={creatingPoster}
            DESCRIPTION_WORD_LIMIT={DESCRIPTION_WORD_LIMIT}
            countWords={countWords}
            isDescriptionTooLong={isDescriptionTooLong}
            setActiveTab={setActiveTab}
            isCreatePosterDragActive={isCreatePosterDragActive}
            handlePosterDragEnter={handlePosterDragEnter}
            handlePosterDragOver={handlePosterDragOver}
            handlePosterDragLeave={handlePosterDragLeave}
            handlePosterDrop={handlePosterDrop}
            createPosterDragCounterRef={createPosterDragCounterRef}
            setIsCreatePosterDragActive={setIsCreatePosterDragActive}
            setNewPosterFile={setNewPosterFile}
            setNewPosterPreview={setNewPosterPreview}
            setCreateError={setCreateError}
            newPosterInputRef={newPosterInputRef}
            setPosterSelection={setPosterSelection}
            openCreatePosterPicker={openCreatePosterPicker}
            newPosterFile={newPosterFile}
            newPosterPreview={newPosterPreview}
          />
        ) : (
          <EventManagementTab
            setActiveTab={setActiveTab}
            totalEvents={totalEvents}
            totalRSVPs={totalRSVPs}
            attendanceRate={attendanceRate}
            tableError={tableError}
            events={events}
            searchQuery={searchQuery}
            eventMatchesSearch={eventMatchesSearch}
            openRsvpModal={openRsvpModal}
            openOdSheet={openOdSheet}
            openQrModal={openQrModal}
            openEditModal={openEditModal}
            setDeleteTarget={setDeleteTarget}
          />
        )}

      {/* Edit Event Modal */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={() => setEditEvent(null)}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg border border-border-subtle dark:border-border-strong overflow-y-auto modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border-subtle dark:border-border-strong">
              <h2 className="text-xl font-bold">Edit Event</h2>
              <IconButton ariaLabel="Close edit event dialog" onClick={() => setEditEvent(null)} size="sm">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </IconButton>
            </div>
            <form onSubmit={handleUpdateEvent} className="p-6 space-y-4">
              {editError ? <Toast tone="error" title="Could not save event" description={editError} /> : null}
              <div>
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary" htmlFor="edit_event_title" required>Event Title</Label>
                <Input id="edit_event_title" type="text" required value={editEvent.title} onChange={e => setEditEvent(p => ({ ...p, title: e.target.value }))} className="border-none" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary" htmlFor="edit_event_description">Short Description (max 100 words)</Label>
                <Textarea
                  id="edit_event_description"
                  value={editEvent.description}
                  onChange={e => setEditEvent(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="border-none"
                />
                <FieldMessage tone={isDescriptionTooLong(editEvent.description) ? 'error' : 'neutral'} className="mt-1">
                  {countWords(editEvent.description)}/{DESCRIPTION_WORD_LIMIT} words
                </FieldMessage>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary" htmlFor="edit_event_keywords">Keywords (comma separated)</Label>
                <Input id="edit_event_keywords" type="text" value={editEvent.keywords} onChange={e => setEditEvent(p => ({ ...p, keywords: e.target.value }))}
                  placeholder="e.g. workshop, python, machine learning"
                  className="border-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary">Start Time</Label>
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
                  <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary">End Time</Label>
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
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary" htmlFor="edit_event_location">Location</Label>
                <Input id="edit_event_location" type="text" value={editEvent.location} onChange={e => setEditEvent(p => ({ ...p, location: e.target.value }))} className="border-none" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="edit_is_paid" checked={editEvent.is_paid || false} onChange={e => setEditEvent(p => ({ ...p, is_paid: e.target.checked }))} className="size-4 rounded-full border border-border-subtle bg-surface-muted text-primary focus:ring-2 focus:ring-primary cursor-pointer" />
                <Label htmlFor="edit_is_paid" className="text-sm">Is this a paid event?</Label>
              </div>

              {editEvent.is_paid && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary" htmlFor="edit_event_registration_fees">Registration Fees</Label>
                    <Input id="edit_event_registration_fees" type="text" value={editEvent.registration_fees || ""} onChange={e => setEditEvent(p => ({ ...p, registration_fees: e.target.value }))}
                      placeholder="e.g. ₹500"
                      className="border-none" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary" htmlFor="edit_event_payment_link">Payment Link (Optional)</Label>
                    <Input id="edit_event_payment_link" type="url" value={editEvent.payment_link || ""} onChange={e => setEditEvent(p => ({ ...p, payment_link: e.target.value }))}
                      placeholder="e.g. https://rzp.io/l/..."
                      className="border-none" />
                  </div>
                </div>
              )}
              <div>
                <Label className="mb-2 block text-xs text-text-secondary dark:text-text-dark-secondary">Category</Label>
                <div className="flex gap-3">
                  {[{ label: 'Tech', value: 'TECH', icon: 'computer' }, { label: 'Non-Tech', value: 'NON_TECH', icon: 'palette' }].map(tag => (
                    <button key={tag.value} type="button" onClick={() => setEditEvent(p => ({ ...p, tag: tag.value }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        editEvent.tag === tag.value
                          ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border-subtle dark:border-border-strong text-text-secondary dark:text-text-dark-secondary hover:border-text-secondary'
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-text-secondary dark:text-text-dark-secondary">Replace Event Poster (optional)</Label>
                <div
                  className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                    isEditPosterDragActive
                      ? 'border-primary bg-primary/5'
                        : 'border-border-subtle dark:border-border-strong bg-surface-muted dark:bg-[#0f1720]/40'
                  }`}
                  onDragEnter={(event) => handlePosterDragEnter(event, setIsEditPosterDragActive, editPosterDragCounterRef)}
                  onDragOver={handlePosterDragOver}
                  onDragLeave={(event) => handlePosterDragLeave(event, setIsEditPosterDragActive, editPosterDragCounterRef)}
                  onDrop={(event) => handlePosterDrop(event, setIsEditPosterDragActive, editPosterDragCounterRef, setEditPosterFile, setEditPosterPreview, setEditError)}
                >
                  <input
                    ref={editPosterInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] || null;
                      setPosterSelection(selectedFile, setEditPosterFile, setEditPosterPreview, setEditError);
                      event.target.value = '';
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={openEditPosterPicker}
                      className="cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      Choose Poster
                    </Button>
                    <span className="text-xs text-text-secondary dark:text-text-dark-secondary truncate max-w-64">{editPosterFile ? editPosterFile.name : 'No new file selected'}</span>
                  </div>
                  <p className="text-xs text-text-secondary dark:text-text-dark-secondary mt-2">or drag and drop an image here</p>
                </div>
                {editPosterPreview ? (
                  <div className="mt-3 w-full max-w-52 aspect-4/5 rounded-lg border border-border-subtle dark:border-border-strong overflow-hidden bg-[#0f1720]">
                    <img src={editPosterPreview} alt="Updated poster preview" className="h-full w-full object-cover" />
                  </div>
                ) : editEvent.image_url ? (
                  <div className="mt-3 w-full max-w-52 aspect-4/5 rounded-lg border border-border-subtle dark:border-border-strong overflow-hidden bg-[#0f1720]">
                    <img src={editEvent.image_url} alt="Current poster" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="mt-3 w-full max-w-52 aspect-4/5 rounded-lg border border-border-subtle dark:border-border-strong overflow-hidden bg-[#0f1720]">
                    <EventPosterFallback title={editEvent.title} size="compact" />
                  </div>
                )}
                {editEvent.image_url && !editPosterFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditEvent((previous) => ({ ...previous, image_url: '' }))}
                    className="mt-2 h-8 px-0 text-xs font-semibold text-danger hover:bg-transparent hover:text-danger/80"
                  >
                    Remove existing poster
                  </Button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditEvent(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={editing || editingPoster}>
                  {editing ? 'Saving...' : editingPoster ? 'Uploading poster...' : 'Save Changes'}
                  {!(editing || editingPoster) && <span className="material-symbols-outlined text-[18px]">check</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={closeQrModal}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg border border-border-subtle dark:border-border-strong flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-subtle dark:border-border-strong">
              <div>
                <h2 className="text-lg font-bold">Attendance QR</h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-text-dark-secondary">{qrModal.event?.title || 'Event'}</p>
              </div>
              <IconButton ariaLabel="Close attendance QR dialog" onClick={closeQrModal} size="sm">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </IconButton>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="rounded-xl border border-border-subtle dark:border-border-strong bg-surface-muted dark:bg-[#111a22] p-3 text-sm flex items-center justify-between">
                <span className="text-text-secondary dark:text-text-dark-secondary">Status</span>
                <StatusBadge tone={qrModal.event?.attendance_qr_open ? 'success' : 'neutral'}>
                  {qrModal.event?.attendance_qr_open ? 'OPEN' : 'CLOSED'}
                </StatusBadge>
              </div>

              {qrModal.error ? <Toast tone="error" title="QR action failed" description={qrModal.error} /> : null}
              {qrModal.notice ? <Toast tone="success" title="QR updated" description={qrModal.notice} /> : null}

              <div className="rounded-xl border border-border-subtle dark:border-border-strong p-4 flex items-center justify-center min-h-72 bg-white dark:bg-[#1a2632]">
                {qrModal.loading ? (
                  <Skeleton className="size-20 rounded-full" />
                ) : qrModal.checkinUrl ? (
                  <QRCodeSVG value={qrModal.checkinUrl} size={240} bgColor="#ffffff" fgColor="#111418" includeMargin />
                ) : (
                  <EmptyState
                    icon="qr_code_2"
                    title="QR pending"
                    description="Open attendance QR to generate and share check-in access."
                  />
                )}
              </div>

              {qrModal.checkinUrl && (
                <div className="rounded-xl border border-border-subtle dark:border-border-strong bg-surface-muted dark:bg-[#111a22] p-3">
                  <p className="mb-2 text-xs text-text-secondary dark:text-text-dark-secondary">Attendance link</p>
                  <p className="text-xs font-mono break-all text-slate-700 dark:text-slate-200">{qrModal.checkinUrl}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  onClick={() => toggleQrAttendance(true)}
                  disabled={qrModal.loading}
                  variant="secondary"
                  className="bg-green-600/15 text-green-700 hover:bg-green-600/25 dark:text-green-400"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Open QR
                </Button>
                <Button
                  onClick={() => toggleQrAttendance(false)}
                  disabled={qrModal.loading}
                  variant="secondary"
                  className="bg-red-600/15 text-red-600 hover:bg-red-600/25 dark:text-red-400"
                >
                  <span className="material-symbols-outlined text-[18px]">stop</span>
                  Close QR
                </Button>
                <Button
                  onClick={copyQrLink}
                  disabled={qrModal.loading || !qrModal.checkinUrl}
                  variant="secondary"
                  className="text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RSVP / Attendance Modal */}
      {rsvpModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={closeRsvpModal}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-4xl border border-border-subtle dark:border-border-strong flex flex-col modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-subtle dark:border-border-strong p-6 gap-4">
              <div>
                <h2 className="text-xl font-bold">{rsvpModal.event?.title || 'Event'} - Event Team & OD</h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-text-dark-secondary">
                  {rsvpModal.tab === 'team'
                    ? `${rsvpModal.workforce.length} Assigned Workers`
                    : `${rsvpModal.rsvps.length} Students Registered`}
                </p>
              </div>

              <div className="flex bg-surface-muted dark:bg-border-strong p-1 rounded-xl w-full sm:w-auto">
                <Button
                  onClick={() => setRsvpModal(p => ({ ...p, tab: 'team' }))}
                  variant={rsvpModal.tab === 'team' ? 'primary' : 'ghost'}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Event Team
                </Button>
                <Button
                  onClick={() => setRsvpModal(p => ({ ...p, tab: 'attendance' }))}
                  variant={rsvpModal.tab === 'attendance' ? 'primary' : 'ghost'}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Student OD
                </Button>
                {rsvpModal.event?.is_paid && (
                    <Button
                      onClick={() => setRsvpModal(p => ({ ...p, tab: 'payment' }))}
                      variant={rsvpModal.tab === 'payment' ? 'primary' : 'ghost'}
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      Payments
                    </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {rsvpModal.tab !== 'team' && (
                  <Button onClick={exportAttendanceCSV} disabled={rsvpModal.loading || rsvpModal.rsvps.length === 0} variant="secondary" className="text-green-600 hover:bg-green-600/20 dark:text-green-400">
                    <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                  </Button>
                )}
                <IconButton ariaLabel="Close attendees dialog" onClick={closeRsvpModal} size="sm">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </IconButton>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {rsvpModal.tab === 'team' ? (
                rsvpModal.workforceLoading ? (
                  <div className="flex justify-center py-12"><Skeleton className="size-20 rounded-full" /></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-border-subtle dark:border-border-strong p-4 space-y-3">
                        <p className="text-sm font-semibold">Assign Club Member</p>
                        <select
                          value={workforceMemberUserId}
                          onChange={(event) => setWorkforceMemberUserId(event.target.value)}
                          className="h-10 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                        >
                          <option value="">Select member</option>
                          {availableClubMembersForEvent.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {(member.name || member.email || 'Student')} {member.register_number ? `(${member.register_number})` : ''}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          onClick={() => handleAddEventWorker(workforceMemberUserId, 'CLUB_MEMBER')}
                          disabled={!workforceMemberUserId}
                          className="w-full"
                        >
                          <span className="material-symbols-outlined text-[18px]">group_add</span>
                          Add Club Member
                        </Button>
                      </div>

                      <div className="rounded-xl border border-border-subtle dark:border-border-strong p-4 space-y-3">
                        <p className="text-sm font-semibold">Assign Volunteer</p>
                        <input
                          value={workforceVolunteerQuery}
                          onChange={(event) => setWorkforceVolunteerQuery(event.target.value)}
                          placeholder="Search student by name, email, register number"
                          className="h-10 w-full rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                        />
                        {workforceVolunteerLoading ? (
                          <p className="text-xs text-text-secondary dark:text-text-dark-secondary">Searching students...</p>
                        ) : workforceVolunteerQuery.trim() ? (
                          volunteerCandidateResults.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {volunteerCandidateResults.slice(0, 8).map((student) => (
                                <div key={student.id} className="flex items-center justify-between rounded-lg bg-surface-muted dark:bg-border-strong px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{student.name || student.email}</p>
                                    <p className="truncate text-xs text-text-secondary dark:text-text-dark-secondary">{student.register_number || student.email}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddEventWorker(student.id, 'VOLUNTEER')}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-text-secondary dark:text-text-dark-secondary">No available students found for this search.</p>
                          )
                        ) : (
                          <p className="text-xs text-text-secondary dark:text-text-dark-secondary">Type to search volunteer candidates.</p>
                        )}
                        {workforceVolunteerError ? <p className="text-xs text-red-500">{workforceVolunteerError}</p> : null}
                      </div>
                    </div>

                    {workforceActionError ? <Toast tone="error" title="Team update failed" description={workforceActionError} /> : null}
                    {workforceActionSuccess ? <Toast tone="success" title="Team updated" description={workforceActionSuccess} /> : null}

                    {rsvpModal.workforce.length === 0 ? (
                      <EmptyState
                        icon="group_off"
                        title="No workers assigned"
                        description="Add club members and volunteers who will work for this event."
                      />
                    ) : (
                      <div className="border border-border-subtle dark:border-border-strong rounded-xl overflow-hidden table-scroll">
                        <table className="w-full min-w-205 text-sm text-left">
                          <thead className="bg-surface-muted dark:bg-[#111a22] border-b border-border-subtle dark:border-border-strong text-xs uppercase text-text-secondary dark:text-text-dark-secondary font-bold">
                            <tr>
                              <th className="px-4 py-3">S.NO</th>
                              <th className="px-4 py-3">NAME</th>
                              <th className="px-4 py-3">ROLE</th>
                              <th className="px-4 py-3">DEPARTMENT</th>
                              <th className="px-4 py-3">YEAR</th>
                              <th className="px-4 py-3">REGISTER NO</th>
                              <th className="px-4 py-3 text-center">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle dark:divide-border-strong">
                            {rsvpModal.workforce.map((worker, index) => (
                              <tr key={worker.id} className="transition-colors hover:bg-surface-muted dark:hover:bg-border-strong/30">
                                <td className="px-4 py-3 font-medium">{index + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{worker.name || worker.email || '-'}</td>
                                <td className="px-4 py-3">
                                  <StatusBadge tone={worker.role === 'CLUB_MEMBER' ? 'info' : 'neutral'}>
                                    {worker.role === 'CLUB_MEMBER' ? 'Club Member' : 'Volunteer'}
                                  </StatusBadge>
                                </td>
                                <td className="px-4 py-3">{worker.department || '-'}</td>
                                <td className="px-4 py-3">{calculateYear(worker.batch, worker.degree, worker.register_number)}</td>
                                <td className="px-4 py-3 font-mono text-xs">{worker.register_number || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEventWorker(worker)}
                                    className="rounded-lg border border-red-500/25 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              ) : rsvpModal.loading ? (
                <div className="flex justify-center py-12"><Skeleton className="size-20 rounded-full" /></div>
              ) : rsvpModal.rsvps.length === 0 ? (
                <EmptyState
                  icon="group_off"
                  title="No RSVPs yet"
                  description="Students who register for this event will appear here for attendance and payment tracking."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {rsvpModal.tab === 'payment' && rsvpModal.event?.is_paid && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
                      <div className="text-sm text-text-secondary">Upload payment CSV to auto-match captured/success rows using name, email, register no, year and department.</div>
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-muted/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                            <span className="material-symbols-outlined text-[18px]">upload_file</span> Upload CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                        </label>
                    </div>
                  )}
                  {paymentFeedback && (
                    <Toast
                      tone={paymentFeedback.type === 'success' ? 'success' : 'error'}
                      title={paymentFeedback.type === 'success' ? 'Payment match complete' : 'Payment match failed'}
                      description={paymentFeedback.text}
                    />
                  )}
                  {rsvpError ? <Toast tone="error" title="Export failed" description={rsvpError} /> : null}

                  <div className="border border-border-subtle dark:border-border-strong rounded-xl overflow-hidden table-scroll">
                    <table className="w-full min-w-205 text-sm text-left">
                      <thead className="bg-surface-muted dark:bg-[#111a22] border-b border-border-subtle dark:border-border-strong text-xs uppercase text-text-secondary dark:text-text-dark-secondary font-bold">
                        <tr>
                          <th className="px-4 py-3">S.NO</th>
                          <th className="px-4 py-3">NAME</th>
                          <th className="px-4 py-3">DEPARTMENT</th>
                          <th className="px-4 py-3">YEAR</th>
                          <th className="px-4 py-3">REGISTER NO</th>
                          {rsvpModal.tab !== 'payment' && (
                            <th className="px-4 py-3">ATTENDANCE MARKED AT</th>
                          )}
                          <th className="px-4 py-3 text-center border-l border-border-subtle dark:border-border-strong">
                              {rsvpModal.tab === 'payment' ? 'PAID' : 'ATTENDED'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle dark:divide-border-strong">
                        {rsvpModal.rsvps.map((rsvp, index) => {
                          const u = rsvp.user || {};
                          return (
                            <tr key={rsvp.id} className="transition-colors hover:bg-surface-muted dark:hover:bg-border-strong/30">
                              <td className="px-4 py-3 font-medium">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{u.name || '-'}</td>
                              <td className="px-4 py-3">{u.department || '-'}</td>
                              <td className="px-4 py-3">{calculateYear(u.batch, u.degree, u.register_number)}</td>
                              <td className="px-4 py-3 font-mono text-xs">{u.register_number || '-'}</td>
                              {rsvpModal.tab !== 'payment' && (
                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                  {formatAttendanceMarkedAt(rsvp.attended_marked_at)}
                                </td>
                              )}
                              <td className="px-4 py-3 text-center border-l border-border-subtle dark:border-border-strong">
                                {rsvpModal.tab === 'payment' ? (
                                    <input
                                      type="checkbox"
                                      checked={rsvp.is_paid || false}
                                      onChange={() => handleTogglePayment(rsvp.id, rsvp.is_paid)}
                                      className="size-5 rounded border border-border-subtle bg-surface-muted text-primary focus:ring-primary cursor-pointer"
                                    />
                                ) : (
                                    <input
                                      type="checkbox"
                                      checked={rsvp.attended || false}
                                      onChange={() => handleToggleAttendance(rsvp.id, rsvp.attended)}
                                      className="size-5 rounded border border-border-subtle bg-surface-muted text-primary focus:ring-primary cursor-pointer"
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
    </AppShell>
  );
};

export default ClubDashboard;
