import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';

const EventRedirect = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id');

  if (!eventId) return <Navigate to="/" replace />;

  const target = user?.role === 'CLUB_ADMIN' ? '/club/calendar' : '/student/calendar';
  return <Navigate to={`${target}?event=${eventId}`} replace />;
};

export default EventRedirect;
