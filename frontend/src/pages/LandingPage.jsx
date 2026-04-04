import React, { useState } from 'react';
import wavcIcon from '../assets/WAVC-edit.png';

const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-[#111a22]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 dark:border-[#233648] bg-white/80 dark:bg-[#111a22]/80 backdrop-blur-md px-4 py-3 lg:px-10">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
            <img src={wavcIcon} alt="WAVC Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">WAVC</h2>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-9">
            {['About', 'Clubs', 'Contact'].map((item) => (
              <a key={item} className="text-slate-600 dark:text-[#92adc9] text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">{item}</a>
            ))}
          </nav>
          <button 
            onClick={() => window.location.href = '/login'}
            className="flex min-w-21 cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
            <span className="truncate">Login</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button 
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
        <div className="md:hidden fixed inset-0 top-16.25 z-40 bg-white/95 dark:bg-[#111a22]/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-5 duration-200">
           <nav className="flex flex-col items-center justify-center p-8 gap-8 h-full">
            {['About', 'Clubs', 'Contact'].map((item) => (
              <a key={item} 
                 className="text-slate-800 dark:text-white text-2xl font-bold hover:text-primary transition-colors" 
                 href="#"
                 onClick={() => setIsMobileMenuOpen(false)}
              >
                {item}
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

      <main className="grow flex flex-col justify-center">
        <section className="flex flex-col items-center justify-center px-4 py-12 lg:px-40 lg:py-20">
          <div className="layout-content-container flex flex-col max-w-240 w-full">
            <div className="@container">
              <div className="">
                <div 
                  className="relative flex min-h-[50vh] md:min-h-[60vh] flex-col gap-6 overflow-hidden rounded-3xl bg-cover bg-position-[center_30%] bg-no-repeat items-center justify-center p-6 md:p-12 text-center shadow-2xl transition-transform hover:scale-[1.01] duration-500" 
                  data-alt="Group of diverse college students laughing together outdoors" 
                  style={{ backgroundImage: 'linear-gradient(rgba(19, 127, 236, 0.4) 0%, rgba(17, 26, 34, 0.9) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDFz8Sp13s0cFzmpOBbUsIuW1qaQx3sSlvaM3FW-fQJiV76a1OWm0mD0yJq2vPUFIV1b6_c6S7eWTWpwcmqdkDAKpNds1aGanbjWDSRASLUs94a6YLzd7IATej5VQD5_WsT3g5kiHvXY1uzJfBdVeFvhdsLoqh9KsvKHQP4x7buVQXRecw_nabFOI_btwgWck6ndH4rLnEd80EZ8Xk_xhU0I81W8MUU-BYZeQncPOr7sgG6gd_WQj-JPyOe0spjfQMQKEM4Jx3AW4c")' }}
                >
                  <div className="absolute inset-0 bg-linear-to-t from-background-dark/90 to-transparent pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col gap-4 max-w-175">
                    <h1 className="text-white text-4xl sm:text-5xl md:text-7xl font-black leading-tight tracking-[-0.033em] drop-shadow-2xl">
                      Stay in the loop.<br/>Stay in the club.
                    </h1>
                    <h2 className="text-white/90 text-lg sm:text-xl font-medium leading-relaxed max-w-150 mx-auto drop-shadow-lg">
                      Discover events, join communities, and manage club activities all in one unified campus platform.
                    </h2>
                  </div>
                  <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
                    <button 
                      onClick={() => window.location.href = '/login'}
                      className="flex items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-8 bg-white text-slate-900 text-base font-bold leading-normal hover:bg-slate-100 transition-colors shadow-lg transform hover:scale-105 duration-200">
                      <img alt="Google G Logo" className="w-6 h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDACkJQDAMqEGYjm0sUAsqKoZ_WzLqom8nDv6Hfc7audxHKfEwl2P48zGR00_7lUGSAyaP1OaeXtu5WfCTMhtt6-fUtZgWs0F_IDgXefze74L-Td8Q1L_cxt_WdzUjHS5a3V75iqB0RFNdk2LQK-6av30F5Ni4Tvj1ryqWxAX9xQlRpDakFCEoaGZUydHJZ3FIbDdYAuV2XK9qLL_prHpdUOU8jXYKKP5IiRNMq9CJDWqu1pNpf5iUA9hXWdz242i6UvcsjqQvwocc"/>
                      <span className="truncate">Sign in with Google</span>
                    </button>
                    <button 
                        className="flex items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-8 bg-white/10 backdrop-blur-md border border-white/30 text-white text-base font-bold leading-normal hover:bg-white/20 transition-colors shadow-lg transform hover:scale-105 duration-200"
                    >
                        Explore Clubs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-6 px-5 py-10 text-center border-t border-slate-200 dark:border-[#233648] bg-slate-50 dark:bg-[#111a22] mt-auto">
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
                <a key={item} className="text-slate-500 dark:text-[#92adc9] text-sm font-normal hover:text-primary transition-colors" href="#">{item}</a>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <a className="flex items-center justify-center w-12 h-12 text-slate-400 dark:text-[#92adc9] hover:text-primary dark:hover:text-white transition-colors bg-slate-200 dark:bg-slate-800 rounded-full" href="#">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>public</span>
            </a>
            <a className="flex items-center justify-center w-12 h-12 text-slate-400 dark:text-[#92adc9] hover:text-primary dark:hover:text-white transition-colors bg-slate-200 dark:bg-slate-800 rounded-full" href="#">
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
