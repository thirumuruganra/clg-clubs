import React, { useState } from 'react';
import wavcIcon from '../assets/WAVC-edit.png';
import heroImage from '../assets/Vamasundari-Park.jpg';
import { Reveal } from '../components/ui/reveal';

const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
    { label: 'How it works', href: '#how-it-works' },
  ];

  const handleSectionNav = (event, href) => {
    if (!href.startsWith('#')) return;

    event.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-surface-canvas font-body text-text-primary">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="atmosphere-grid"></div>
      </div>

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-subtle bg-surface-canvas/88 px-4 py-3 backdrop-blur-md lg:px-10">
        <div className="flex items-center gap-4 text-text-primary">
          <div className="size-10 overflow-hidden rounded-xl bg-primary/18 p-1.5 shadow-soft-sm">
            <img src={wavcIcon} alt="WAVC Logo" className="h-full w-full object-contain" />
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight">WAVC</h2>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-9">
            {navItems.map((item) => (
              <a
                key={item.label}
                className="interactive-press rounded-lg px-2 py-1 text-sm font-semibold leading-normal text-text-secondary transition-colors hover:text-primary"
                href={item.href}
                onClick={(event) => handleSectionNav(event, item.href)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            onClick={() => window.location.href = '/login'}
            className="interactive-press flex h-10 min-w-21 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary px-4 text-sm font-bold leading-normal text-white shadow-soft-md hover:shadow-soft-lg"
          >
            <span className="truncate">Login</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="interactive-press rounded-xl p-2 text-text-secondary transition-colors hover:text-primary focus:outline-none"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      <div
        aria-hidden={!isMobileMenuOpen}
        className={`fixed inset-x-0 bottom-0 z-40 bg-surface-panel/95 backdrop-blur-xl transition-[opacity,transform] duration-300 ease-out md:hidden ${isMobileMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}
        style={{
          top: 'calc(4rem + env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <nav className="flex h-full flex-col items-center justify-center gap-8 p-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              className="interactive-press rounded-xl px-4 py-2 text-2xl font-bold text-text-primary transition-colors hover:text-primary"
              href={item.href}
              onClick={(event) => handleSectionNav(event, item.href)}
            >
              {item.label}
            </a>
          ))}
          <button
            onClick={() => window.location.href = '/login'}
            className="interactive-press mt-4 h-14 w-full max-w-50 rounded-xl bg-primary text-lg font-bold text-white shadow-soft-lg"
          >
            Login
          </button>
        </nav>
      </div>

      <main className="relative z-10 grow flex flex-col">
        <section className="px-4 pb-8 pt-10 md:px-8 lg:px-16 lg:pt-14">
          <div className="layout-content-container mx-auto flex max-w-240 flex-col gap-8">
            <Reveal className="aura-panel grid gap-8 rounded-3xl border border-border-subtle bg-surface-panel p-6 shadow-soft-lg md:grid-cols-12 md:p-10" distance={20}>
              <img
                src={heroImage}
                alt="Tree-lined campus road"
                className="absolute inset-0 h-full w-full object-cover opacity-18"
              />
              <div className="absolute inset-0 bg-overlay-scrim" aria-hidden="true"></div>
              <div className="relative z-10 md:col-span-7 lg:col-span-8">
                <span className="kicker-label">SSN Campus Network</span>
                <h1 className="headline-display mt-5 max-w-2xl text-white">
                  Stay in the loop. Run your campus story.
                </h1>
                <p className="type-lead mt-5 text-white/88">
                  Discover events, join communities, and manage club momentum from one home built for student life.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="interactive-press inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-6 text-base font-bold text-slate-900 hover:bg-slate-100 sm:w-auto"
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
                    className="interactive-press inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/35 bg-white/10 px-6 text-base font-bold text-white transition-colors hover:bg-white/18 sm:w-auto"
                  >
                    Explore Clubs
                  </button>
                </div>
              </div>

              <div className="relative z-10 grid gap-3 sm:grid-cols-3 md:col-span-5 md:grid-cols-1 lg:col-span-4">
                {[
                  { label: 'Events This Month', value: '10+' },
                  { label: 'Active Clubs', value: '25+' },
                  { label: 'Students Connected', value: '3000+' },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border border-white/18 bg-black/25 p-4 text-white backdrop-blur-sm enter-rise ${index === 0 ? 'enter-delay-1' : index === 1 ? 'enter-delay-2' : 'enter-delay-3'}`}
                  >
                    <p className="type-metric text-white">{stat.value}</p>
                    <p className="type-label mt-2 text-white/76">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal className="grid grid-cols-1 gap-4 md:grid-cols-3" delay={120}>
              {[
                { title: 'Centralized Events', body: 'Find upcoming activities from all clubs in one place.' },
                { title: 'Personalized Feed', body: 'Get recommendations based on your interests and follows.' },
                { title: 'Club Workflows', body: 'Publish events, track RSVPs, and manage attendance.' },
              ].map((item) => (
                <article
                  key={item.title}
                  className="feature-card p-5"
                >
                  <h2 className="text-xl font-bold text-text-primary dark:text-white">{item.title}</h2>
                  <p className="type-body mt-2 text-text-secondary dark:text-text-dark-secondary">{item.body}</p>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="about" className="px-4 pb-2 pt-2 md:px-8 lg:px-16 lg:pb-8 lg:pt-4">
          <Reveal className="layout-content-container mx-auto grid max-w-240 items-stretch gap-6 rounded-3xl border border-border-subtle bg-surface-panel p-6 shadow-soft-md lg:grid-cols-[1.1fr_1fr] lg:p-10" delay={80}>
            <div className="flex h-full flex-col justify-center gap-4 lg:pr-4">
              <span className="kicker-label w-fit">Built for campus communities</span>
              <h2 className="section-title text-text-primary dark:text-white">Every club moment in one shared flow.</h2>
              <p className="type-body mt-2 text-text-secondary dark:text-text-dark-secondary">
                WAVC lets students discover what matters now and gives club admins a faster way to organize events, followers, and attendance.
              </p>
            </div>
            <div id="how-it-works" className="grid grid-cols-1 content-start gap-3 scroll-mt-28 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { title: 'Discover', body: 'Browse curated events from followed and new clubs.' },
                { title: 'Register', body: 'RSVP quickly and keep your activity history organized.' },
                { title: 'Participate', body: 'Attend events and grow your campus involvement.' },
              ].map((step) => (
                <div key={step.title} className="interactive-press h-full rounded-xl border border-border-subtle bg-surface-muted p-4 dark:border-border-strong dark:bg-surface-canvas">
                  <h3 className="text-base font-semibold text-text-primary dark:text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary dark:text-text-dark-secondary">{step.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </main>

      <footer id="contact" className="relative z-10 mt-5 px-5 py-6 text-center text-text-primary md:mt-6">
        <div className="layout-content-container relative z-10 mx-auto flex w-full max-w-240 flex-col items-center gap-7">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-primary/12 p-1.5 shadow-soft-sm">
              <img src={wavcIcon} alt="WAVC Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-display text-[2rem] font-bold leading-none text-text-primary dark:text-white">WAVC</span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <span className="kicker-label px-5 py-2 text-xs">
              The Team that made this possible
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-0 gap-y-3 text-base font-semibold text-text-secondary dark:text-text-dark-secondary">
              <a
                className="interactive-press px-5 transition-colors hover:text-primary"
                href="https://www.linkedin.com/in/thirumuruganra/"
                target="_blank"
                rel="noreferrer"
              >
                Thirumurugan RA
              </a>
              <span className="hidden h-5 w-px bg-border-subtle dark:bg-border-strong sm:block" aria-hidden="true"></span>
              <a
                className="interactive-press px-5 transition-colors hover:text-primary"
                href="https://www.linkedin.com/in/vishalmuralidharan/"
                target="_blank"
                rel="noreferrer"
              >
                Vishal Muralidharan
              </a>
            </div>
          </div>

          <div className="mb-1 flex flex-wrap justify-center gap-4">
            <a
              className="interactive-press flex h-13 w-13 items-center justify-center rounded-full border border-border-subtle bg-surface-muted text-text-secondary shadow-soft-sm transition-colors hover:border-primary/40 hover:text-primary dark:border-border-strong dark:bg-surface-elevated dark:text-text-dark-secondary dark:hover:text-white"
              href="https://github.com/thirumuruganra/clg-clubs"
              target="_blank"
              rel="noreferrer"
              aria-label="Open clg-clubs GitHub repository"
              title="GitHub"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.24c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.33-1.77-1.33-1.77-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.79 1.3 3.47.99.1-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.9 0-1.3.47-2.36 1.23-3.2-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.22a11.43 11.43 0 0 1 6 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.65.24 2.87.12 3.17.77.84 1.23 1.9 1.23 3.2 0 4.58-2.8 5.6-5.48 5.9.43.38.82 1.1.82 2.22v3.3c0 .32.22.69.83.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
              </svg>
            </a>
            <a
              className="interactive-press flex h-13 w-13 items-center justify-center rounded-full border border-border-subtle bg-surface-muted text-text-secondary shadow-soft-sm transition-colors hover:border-primary/40 hover:text-primary dark:border-border-strong dark:bg-surface-elevated dark:text-text-dark-secondary dark:hover:text-white"
              href="mailto:wavc.contact@gmail.com"
              aria-label="Email wavc.contact@gmail.com"
              title="wavc.contact@gmail.com"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>mail</span>
            </a>
          </div>

          <p className="w-full text-center text-sm font-medium text-text-tertiary dark:text-text-dark-secondary/80">© 2026 WAVC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
