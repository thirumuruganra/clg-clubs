import React from 'react';
import { useLocation } from 'react-router-dom';
import wavcIcon from '../assets/WAVC-edit.png';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { FieldMessage } from '../components/ui/field-message';

const Login = () => {
  const location = useLocation();

  const authErrorCode = new URLSearchParams(location.search).get('error');
  const authErrorMessage = authErrorCode === 'ssn_email_required'
    ? 'Please login with SSN Student Email ID.'
    : '';

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-50 font-body dark:bg-surface-panel">
      <div className="relative z-10 w-full max-w-md p-5 sm:p-6">
        <Card elevated className="flex flex-col items-center rounded-2xl border-white/20 bg-white/75 p-6 text-center shadow-soft-xl backdrop-blur-xl dark:bg-surface-elevated/75 sm:p-8">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <img src={wavcIcon} alt="WAVC Logo" className="h-10 w-10 object-contain" />
          </div>

          <h1 className="type-page-title mb-2 text-balance text-slate-900 dark:text-white sm:text-4xl">Welcome Back</h1>
          <p className="type-body mb-8 max-w-xs text-slate-500 dark:text-slate-400">
            Sign in to access your clubs, events, and community dashboard.
          </p>

          {authErrorMessage ? (
            <div className="mb-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
              <FieldMessage tone="error">{authErrorMessage}</FieldMessage>
            </div>
          ) : null}

          <Button
            onClick={handleLogin}
            variant="secondary"
            className="group h-12 w-full border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-border-strong dark:text-white dark:hover:bg-border-strong/80"
          >
            <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </Button>

          <div className="mt-8 w-full border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="type-label text-slate-400 dark:text-slate-500">
              Institutional Access Only
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
