import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const { data: user = null, isLoading: loading, refetch: refetchUser } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const logout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
