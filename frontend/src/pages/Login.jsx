import React from 'react';
import { useLocation } from 'react-router-dom';
import wavcIcon from '../assets/WAVC-edit.png'; // Assuming this exists from LandingPage

const Login = () => {
    const location = useLocation();
    // In a real app, use environment variables
    const BACKEND_URL = "http://localhost:8000";

    const authErrorCode = new URLSearchParams(location.search).get('error');
    const authErrorMessage = authErrorCode === 'ssn_email_required'
        ? 'Please login with SSN Student Email ID.'
        : '';

    const handleLogin = () => {
        window.location.href = `${BACKEND_URL}/api/auth/login`;
    };

    return (
        <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#111a22]">

            <div className="relative z-10 w-full max-w-md p-5 sm:p-6 mx-4">
                <div className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300 hover:shadow-primary/10">
                    <div className="mb-6 h-16 w-16 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {/* Use the logo if available, else a styled placeholder */}
                        <img src={wavcIcon} alt="WAVC Logo" className="w-10 h-10 object-contain" />
                    </div>
                    
                    <h1 className="text-balance text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                        Sign in to access your clubs, events, and community dashboard.
                    </p>

                    {authErrorMessage && (
                        <p className="mb-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300">
                            {authErrorMessage}
                        </p>
                    )}

                    <button 
                        onClick={handleLogin}
                        className="touch-target group w-full flex items-center justify-center gap-3 bg-white dark:bg-[#233648] hover:bg-slate-50 dark:hover:bg-[#2d465e] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Continue with Google</span>
                    </button>
                    
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 w-full">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">
                            Institutional Access Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
