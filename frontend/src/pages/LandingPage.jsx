import React, { useState } from 'react';
import wavcIcon from '../assets/WAVC-edit.png';
import heroImage from '../assets/Vamasundari-Park.jpg';

const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
    { label: 'About', href: '#about' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-white dark:bg-[#111a22]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 dark:border-border-strong bg-white/80 dark:bg-[#111a22]/80 backdrop-blur-md px-4 py-3 lg:px-10">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
            <img src={wavcIcon} alt="WAVC Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h2 className="text-xl font-bold leading-tight">WAVC</h2>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-9">
            {navItems.map((item) => (
              <a
                key={item.label}
                className="text-slate-600 dark:text-text-dark-secondary text-sm font-medium leading-normal hover:text-primary transition-colors"
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            onClick={() => window.location.href = '/login'}
            className="flex min-w-21 cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
            <span className="truncate">Login</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button 
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors focus:outline-none"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-[#111a22]/95 backdrop-blur-xl"
          style={{
            top: 'calc(4rem + env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
           <nav className="flex flex-col items-center justify-center p-8 gap-8 h-full">
            {navItems.map((item) => (
              <a key={item.label}
                 className="text-slate-800 dark:text-white text-2xl font-bold hover:text-primary transition-colors" 
                 href={item.href}
                 onClick={() => setIsMobileMenuOpen(false)}
               >
                 {item.label}
               </a>
             ))}
             <button 
               onClick={() => window.location.href = '/login'}
               className="mt-4 w-full max-w-50 h-14 rounded-xl bg-primary text-white text-lg font-bold shadow-xl shadow-blue-500/30"
            >
              Login
            </button>
          </nav>
        </div>
      )}

      <main className="grow flex flex-col">
        <section className="px-4 py-10 md:px-8 lg:px-40 lg:py-16">
          <div className="layout-content-container mx-auto flex max-w-240 flex-col gap-8">
            <div className="relative overflow-hidden rounded-3xl border border-border-subtle dark:border-border-strong bg-[#111a22] p-6 sm:p-10 lg:p-14">
              <img
                src={heroImage}
                alt="Tree-lined campus road"
                className="absolute inset-0 h-full w-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-black/45" aria-hidden="true"></div>
              <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-5 text-center">
                <h1 className="text-balance text-3xl font-black leading-tight text-white sm:text-5xl md:text-6xl">
                  Stay in the loop. Stay in the club.
                </h1>
                <p className="mx-auto max-w-3xl text-pretty text-base font-medium leading-relaxed text-white/90 sm:text-xl">
                  Discover events, join communities, and manage club activities in one campus platform.
                </p>
                <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-6 text-base font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:h-13 sm:w-auto"
                  >
                    <img
                      alt="Google G Logo"
                      className="h-5 w-5"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDACkJQDAMqEGYjm0sUAsqKoZ_WzLqom8nDv6Hfc7audxHKfEwl2P48zGR00_7lUGSAyaP1OaeXtu5WfCTMhtt6-fUtZgWs0F_IDgXefze74L-Td8Q1L_cxt_WdzUjHS5a3V75iqB0RFNdk2LQK-6av30F5Ni4Tvj1ryqWxAX9xQlRpDakFCEoaGZUydHJZ3FIbDdYAuV2XK9qLL_prHpdUOU8jXYKKP5IiRNMq9CJDWqu1pNpf5iUA9hXWdz242i6UvcsjqQvwocc"
                    />
                    <span>Sign in with Google</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/student/clubs'}
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-white/40 bg-transparent px-6 text-base font-bold text-white transition-colors hover:bg-white/10 sm:h-13 sm:w-auto"
                  >
                    Explore Clubs
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { title: 'Centralized Events', body: 'Find upcoming activities from all clubs in one place.' },
                { title: 'Personalized Feed', body: 'Get recommendations based on your interests and follows.' },
                { title: 'Club Workflows', body: 'Publish events, track RSVPs, and manage attendance.' },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm dark:border-border-strong dark:bg-[#1a2632]"
                >
                  <h2 className="text-lg font-bold text-text-primary dark:text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-text-dark-secondary">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="px-4 pt-2 pb-2 md:px-8 lg:px-40 lg:pt-6 lg:pb-20">
          <div className="layout-content-container mx-auto grid max-w-240 items-stretch gap-6 rounded-3xl border border-border-subtle bg-white p-6 dark:border-border-strong dark:bg-[#1a2632] lg:grid-cols-[1.1fr_1fr] lg:p-8">
            <div className="flex h-full flex-col justify-center gap-4 lg:pr-4">
              <h2 className="text-2xl font-bold text-text-primary dark:text-white">Built for campus communities</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary dark:text-text-dark-secondary">
                WAVC helps students discover relevant events and helps clubs run smoother operations with one shared workflow.
              </p>
            </div>
            <div id="how-it-works" className="grid grid-cols-1 content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { title: 'Discover', body: 'Browse curated events from followed and new clubs.' },
                { title: 'Register', body: 'RSVP quickly and keep your activity history organized.' },
                { title: 'Participate', body: 'Attend events and grow your campus involvement.' },
              ].map((step) => (
                <div key={step.title} className="h-full rounded-xl border border-border-subtle bg-[#f6f7f8] p-4 dark:border-border-strong dark:bg-[#111a22]">
                  <h3 className="text-sm font-bold text-text-primary dark:text-white">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-text-secondary dark:text-text-dark-secondary">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="mt-auto flex flex-col gap-6 border-t border-slate-200 bg-slate-50 px-5 py-10 text-center dark:border-border-strong dark:bg-[#111a22]">
        <div className="layout-content-container mx-auto flex flex-col max-w-240 w-full">
          <div className="flex flex-col items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-2">
              <div className="w-10 h-10 flex items-center justify-center text-primary overflow-hidden">
                  <img src={wavcIcon} alt="WAVC Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-bold">WAVC</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {['About Us', 'Privacy Policy', 'Terms of Service', 'Support'].map((item) => (
                <a key={item} className="text-slate-500 dark:text-text-dark-secondary text-sm font-normal hover:text-primary transition-colors" href="#">{item}</a>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <a className="flex items-center justify-center w-12 h-12 text-slate-400 dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors bg-slate-200 dark:bg-slate-800 rounded-full" href="#">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>public</span>
            </a>
            <a
              className="flex items-center justify-center w-12 h-12 text-slate-400 dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors bg-slate-200 dark:bg-slate-800 rounded-full"
              href="mailto:wavc.contact@gmail.com"
              aria-label="Email wavc.contact@gmail.com"
              title="wavc.contact@gmail.com"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>mail</span>
            </a>
          </div>
          <p className="text-slate-400 dark:text-slate-600 text-sm font-normal leading-normal">© 2026 WAVC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
