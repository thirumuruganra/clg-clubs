import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import ClubsCalendarTab from '../components/club-dashboard/ClubsCalendarTab';

const ClubsCalendar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !user.managed_club_id) {
      navigate(user.role === 'CLUB_ADMIN' ? '/club/setup' : '/student/dashboard');
    }
  }, [user, loading, navigate]);

  return <ClubsCalendarTab />;
};

export default ClubsCalendar;
