import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import wavcIcon from '../assets/WAVC-edit.png';

const Dashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // Retrieve user details from URL query parameters
    const userId = searchParams.get('user_id'); 
    const name = searchParams.get('name') || 'Student';
    const email = searchParams.get('email');
    const role = searchParams.get('role') || 'STUDENT';
    const picture = searchParams.get('picture');
    const incompleteProfile = searchParams.get('incomplete_profile');

    const [searchQuery, setSearchQuery] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        // Set dynamic date
        const date = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        setCurrentDate(date.toLocaleDateString('en-US', options));
    }, []);

    useEffect(() => {
        if (incompleteProfile === 'true') {
            navigate(`/profile?${searchParams.toString()}`);
        }
    }, [incompleteProfile, navigate, searchParams]);
    
    const handleProfileClick = () => {
        navigate(`/profile?${searchParams.toString()}`);
    };



  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display group/design-root overflow-x-hidden text-slate-900 dark:text-white">
      <div className="layout-container flex h-full grow flex-col">
        
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] dark:border-[#233648] px-10 py-3 bg-white dark:bg-[#111a22]">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 text-[#111418] dark:text-white">
              <div className="size-8 text-primary flex items-center justify-center">
                <img src={wavcIcon} alt="WAVC Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">WAVC</h2>
            </div>
            <label className="flex flex-col min-w-40 !h-10 max-w-64">
              <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                <div className="text-[#637588] dark:text-[#92adc9] flex border-none bg-[#f0f2f4] dark:bg-[#233648] items-center justify-center pl-4 rounded-l-xl border-r-0">
                  <span className="material-symbols-outlined text-[24px]">search</span>
                </div>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border-none bg-[#f0f2f4] dark:bg-[#233648] focus:border-none h-full placeholder:text-[#637588] dark:placeholder:text-[#92adc9] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </label>
          </div>
          <div className="flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-9">
              <a className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary transition-colors" href="#">Dashboard</a>
              <a className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary transition-colors" href="#">Clubs</a>
              <a className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary transition-colors" href="#">My Calendar</a>
            </div>
            {/* Show "Create Event" only for CLUB_ADMIN */}
            {role === 'CLUB_ADMIN' && (
              <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                <span className="truncate">Create Event</span>
              </button>
            )}
            
            {/* Profile Picture or Initial */}
            <button onClick={handleProfileClick} className="focus:outline-none transition-transform active:scale-95">
                {picture ? (
                     <div 
                     className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-white/10" 
                     style={{ backgroundImage: `url("${picture}")` }}
                   ></div>
                ) : (
                    <div className="size-10 rounded-full ring-2 ring-white/10 bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
            </button>
           
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-8">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            
            {/* Welcome Message */}
            <div className="flex justify-between items-end pb-3 pt-6 px-4">
              <div>
                <h1 className="text-[#111418] dark:text-white tracking-light text-[32px] font-bold leading-tight">Welcome back, {name}!</h1>
                <p className="text-[#637588] dark:text-[#92adc9] text-base font-normal mt-2">Here's what's happening around campus today.</p>
              </div>
              <div className="text-[#637588] dark:text-[#92adc9] text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                <span>{currentDate}</span>
              </div>
            </div>

            {/* Event Calendar Tile */}
            <div className="grid grid-cols-1 gap-4 p-4">
              <div className="group relative cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md h-80">
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
                  style={{ backgroundImage: 'linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.2) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuB3zrC2zWTw2D4ivcIDWAb6vufiRs4bu3TgruhnB8zNBUeKci7kXQow7VafPKRga4Lua80PMNk1-QDne8Jz2xL8sVt3D4vk8aly08_J7ECW6ibdVKe9cK___pbaTzgl6Ao0GGmlrhdkYYcHHKC28MFxi-5Mx_ilnkcmxWj5IIVBLlLxQYWXwPOekKPJDW0-W2SFeW-zf9V-A-3yzcHNOiIBjXVzDYVZKSGxx5ZgP8Wqr1aIRU71sDUnwUvmUITWOzvvnhPYUWOcoek")' }}
                ></div>
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <div className="mb-4 flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined rounded-full bg-white/20 p-3 text-white backdrop-blur-sm text-2xl">calendar_month</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">Event Calendar</h3>
                  <p className="text-base text-gray-200 line-clamp-2 max-w-2xl">Check out all scheduled activities and plan your semester ahead. Never miss an important event from your favorite clubs.</p>
                </div>
              </div>
            </div>

            {/* "For You" Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between px-4 pb-4">
                <div>
                  <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">For You</h2>
                  <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Upcoming events from clubs you follow</p>
                </div>
                <button className="text-primary text-sm font-bold hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                
                {/* Card 1 */}
                <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648]">
                  <div className="relative h-40 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCxE5yMV54RoPUC5-mhV3WWF9lN5Y-c_4Hj1tMH4tS_7b0RPYVZkQsj8XAgYBI_MyCNjpYBQb_ST_6ciM8m-gxkvOdRyqdjRmWrZLgY30rA2HDes-5ip1Z2N455wpg2UQZUX3QbFXldxyn0-fqL_BJU4Op8npM5SSOlvRPlJ3V8P26qVsskyQxQQDeEFWaGFpBW4H5gV04qDmNSbxeJrtjZG9QWTVBS6ZphFQ_AYt0QAgHTU7v9BknsZR4HdDslkGNJRhw6_WmCY9c")' }}>
                    <div className="absolute top-3 right-3 rounded-lg bg-white/90 dark:bg-[#111a22]/90 px-2 py-1 text-center backdrop-blur-sm shadow-sm">
                      <p className="text-xs font-bold text-primary uppercase">OCT</p>
                      <p className="text-lg font-bold text-[#111418] dark:text-white">26</p>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-blue-700/10">Robotics Club</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-4">
                    <h3 className="mb-1 text-lg font-bold text-[#111418] dark:text-white">Bot Wars: Introduction</h3>
                    <p className="mb-4 text-sm text-[#637588] dark:text-[#92adc9] line-clamp-2">Learn the basics of combat robotics and form your teams for the semester tournament.</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <img alt="Avatar" className="inline-block size-6 rounded-full ring-2 ring-white dark:ring-[#1a2632]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtw3LWOHMdOP7QnwCQlCB9n_zkksrQunq3kSkvT0q1Mj0wFlvXSEYWG2zgOidK-u3oOgkIc8yHBCr7ktcgGC2Kgo00qSU0SGZ1MFIfp2S5Io8gg4WxtBSNJkR9HTJdMYf0b1jcUhDsooNaFaYihJaC_tMyDs6HGe57qlEWxN8OYZ3w_Lh0H_QsMu99QZZEYMmBF8P60hzpEKzZ6StkFpzHgfBkTx606gRu_NNPFUrTOf0PdXEKuxLFrUkU_LefYVk3i2osf--oorI"/>
                        <img alt="Avatar" className="inline-block size-6 rounded-full ring-2 ring-white dark:ring-[#1a2632]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjBZnJYzK8qANkxz753Gz9zUms5PMBrZ456q84SSkcmJRjna7M1R_4RLPyH17jaMsw2vblCXDs1MYJzZMH8NCHgpvSwmygtJTWRHMboDsqpu78V4lM4ZPM8dleh0E3z1jrXATOZguwYpzl8QfTkLJkUG1XWGjUTQVtGhSwZhsavChbAi6R0SHkDvAwvkDtGXJnSBPQfQg9GFiAK2L43wnzC5qWglN_rTU2t6myI33fP5ZzpPlNeATrhTvZIE3t4geqq7hDfAu6Evk"/>
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 ring-2 ring-white dark:ring-[#1a2632] text-[10px] font-bold text-primary">+12</span>
                      </div>
                      <button className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors">Register</button>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648]">
                  <div className="relative h-40 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC7Z5rLQt6tWoHSLdSDHgbsx5LJ7QUNjCgKU58ZggDQg--juIme258MrLFbc3TlIO6VluE_jKrJYxcu8EonnFHzXha9n1m4nSywpwxpZZqwYDeOmP3LlMrq90UhQr5dAR_g5_EAt7ClaT1iZ8gaDI0nDYWymfNRif-vBTWJUEC72XlXXv9flb8IxFnl9I0Yb6ANF3bGzedeSxIkrAa4Z6VDIBNVM7ZNya1Qs8JzjltLWOrzBJPlOAPpYw1utX1aee-JRQFVuDw6B8c")' }}>
                    <div className="absolute top-3 right-3 rounded-lg bg-white/90 dark:bg-[#111a22]/90 px-2 py-1 text-center backdrop-blur-sm shadow-sm">
                      <p className="text-xs font-bold text-primary uppercase">NOV</p>
                      <p className="text-lg font-bold text-[#111418] dark:text-white">02</p>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-blue-700/10">Photo Society</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-4">
                    <h3 className="mb-1 text-lg font-bold text-[#111418] dark:text-white">Campus Golden Hour Walk</h3>
                    <p className="mb-4 text-sm text-[#637588] dark:text-[#92adc9] line-clamp-2">Join us for a sunset photography walk around the main quad. Bring your own camera!</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <img alt="Avatar" className="inline-block size-6 rounded-full ring-2 ring-white dark:ring-[#1a2632]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNPjzCHU0Ao0z5cYj1rc-PD3ETYTbUng_MEPqcgIsIG-9YbCDcQpK16jRzaGGuk5RVcJqx_UY523Zn-iywTPgG1db04VHKkl7As-iH6469ZD9GrrxR43J872TrxOYwIPgmLnQO8ZAIF9tT5BpkgC2YULYKE4PG-049kk4UK3POsfl-T054E_LAkNdrgqHY9wXU0mv_BynPRx1M2FP0K9PqbccTOPyTx8pvcMGw4zMJs3JvLYHNB5VcKzRndprCSQfpdybHVoI_nfg"/>
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 ring-2 ring-white dark:ring-[#1a2632] text-[10px] font-bold text-primary">+8</span>
                      </div>
                      <button className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors">Register</button>
                    </div>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648]">
                  <div className="relative h-40 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuABDcnJMC-blw8Na11hfVuHlddHXFoOyEYIVSxKYllN6cG72bzE2novXufx-Qw3igDI322cYnPNXgDpAg_RxlD0pPBM_OlYiMlewcvt_KDnqhYueCMDwd0zBMUR0AitEuXgwZpoYILBAsC6op3-P_n7IeoI8-BM982zl6F715wpUmvVqEI1K0s3Xrw7aT8IsmJCbbryH0armEM47iwNqEGRdK_HZ-0EB8KXlvBEmKnTumwnQy52OjwLIBahFeHCbWyOV6qsVOH8bI0")' }}>
                    <div className="absolute top-3 right-3 rounded-lg bg-white/90 dark:bg-[#111a22]/90 px-2 py-1 text-center backdrop-blur-sm shadow-sm">
                      <p className="text-xs font-bold text-primary uppercase">NOV</p>
                      <p className="text-lg font-bold text-[#111418] dark:text-white">05</p>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-blue-700/10">Debate Team</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-4">
                    <h3 className="mb-1 text-lg font-bold text-[#111418] dark:text-white">Open Mic Debate Night</h3>
                    <p className="mb-4 text-sm text-[#637588] dark:text-[#92adc9] line-clamp-2">Topic: "AI in Education". Open to all students. Sign up to speak or just listen.</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <img alt="Avatar" className="inline-block size-6 rounded-full ring-2 ring-white dark:ring-[#1a2632]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQDukohSPRqPBIVB_pubDUqJXrnyb6h7IfvoTmqOvznzGQhmqJ00HH9pmUxIxV5FdUEcUiG0ZTxQ_ZjkwjgHHNHPp5ijPDsZf26CXZcXTRoWWGQevHm_myzkDzEXa4wbJ2TeKngrQbJsWoW8ouaVuaOevdRjwSstpQokysaE7gG4Gjci2cRSiy0gbQ06uGNWzn4ocy_U2xwP6LQ7b5HsEnireb5kiVlKSIqpyTxA5S6V2CNjymtNG8oP-y1MLtw9XrYfirWt88d3c"/>
                        <img alt="Avatar" className="inline-block size-6 rounded-full ring-2 ring-white dark:ring-[#1a2632]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuQDIoaBkC7vZvgjENUgpzwk0IekmwP0eAkEHlqs9q-MqZM8_pHFJSFnAU4XV3z-Za6WhtuaneLnFN_fhFZnJePHQQ9TGsl7hjbDhm-AXWBU1DYks4m0owCi4jz32Ufz91BxMHkFKNxdRK0C0zlUxtsm9p5pKyEOEm-jXyMXDEx9Q5qDC5T-F9ByEryvb_sWeY298AVzzF4TxQV0bx8E2BfiNvIYrUBPnrS7mnmKlmtdKepBut43iXam5QjrUoUJcMUhlajkPheNs"/>
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 ring-2 ring-white dark:ring-[#1a2632] text-[10px] font-bold text-primary">+24</span>
                      </div>
                      <button className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors">Register</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Random & Discover Section */}
            <div className="mt-10 mb-8">
              <div className="flex items-center justify-between px-4 pb-4">
                <div>
                  <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Random & Discover</h2>
                  <p className="text-[#637588] dark:text-[#92adc9] text-sm mt-1">Explore events from clubs you haven't joined yet</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center justify-center rounded-full bg-[#f0f2f4] dark:bg-[#233648] p-2 hover:bg-[#e5e7eb] dark:hover:bg-[#34485c]">
                    <span className="material-symbols-outlined text-[#111418] dark:text-white text-[20px]">chevron_left</span>
                  </button>
                  <button className="flex items-center justify-center rounded-full bg-[#f0f2f4] dark:bg-[#233648] p-2 hover:bg-[#e5e7eb] dark:hover:bg-[#34485c]">
                    <span className="material-symbols-outlined text-[#111418] dark:text-white text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                
                {/* List Item 1 */}
                <div className="flex flex-row overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] h-40">
                  <div className="w-1/3 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBc0goOgS6rvEED_SLwRNCvg4C6Xhd-3Oh7NRrOSDUF2ZtyWBelIlUVZv8HJn_RBMBAS3hLw7FSUeGGnBRxoouOZQ8ROmv4nets4HH7KzBKfOKZE-4tRUWLrnGtTtH-RjNTY3A5qdfhUrhvFxd0x4xks85tcgQGC1DlsI7uTEoFGHHwWbm85RfMEwru6DqyfyLzHKFFvNO0P3-SPUl8q7DF2q7I4j41LdVr5SC9u0EaeKHLazxzrj8vUx65UoGzLIsGtrlB-gD14sk")' }}></div>
                  <div className="flex w-2/3 flex-col p-4 justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Ceramics Club</span>
                        <span className="text-xs text-[#637588] dark:text-[#92adc9] font-medium bg-[#f0f2f4] dark:bg-[#233648] px-2 py-0.5 rounded">Nov 12</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#111418] dark:text-white leading-tight">Pottery Throwdown</h3>
                      <div className="flex items-center gap-1 mt-2 text-[#637588] dark:text-[#92adc9]">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span className="text-xs">Art Studio B</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] dark:border-[#233648] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                        More Info
                      </button>
                    </div>
                  </div>
                </div>

                {/* List Item 2 */}
                <div className="flex flex-row overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] h-40">
                  <div className="w-1/3 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDAFfSS30JDmNw1KoEPrayFi9HQKN5He1RpKN3dpm_4vuOl69dQXUZWghP9aWg4Q1M4rVAM-6l-srcjaeGkVjr2XFqxwyvlTVTbdxuS0fFZpM3RjHWKt47BIKOVRQnVc_4BTS_wRa2w_fWXI9b5fcwNwGUuQKg-moQ78y-tg6kdN2jEZTlz_NQBq8ddAt85pzlzhXfIgYKWSO9Xll6ZeLASl6M0jTB1FmizhCFZzQAnVXLu2gGBIijfOnq3yZLsB1t8zQrnoKqN6A4")' }}></div>
                  <div className="flex w-2/3 flex-col p-4 justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Chess Club</span>
                        <span className="text-xs text-[#637588] dark:text-[#92adc9] font-medium bg-[#f0f2f4] dark:bg-[#233648] px-2 py-0.5 rounded">Nov 14</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#111418] dark:text-white leading-tight">Speed Chess Tournament</h3>
                      <div className="flex items-center gap-1 mt-2 text-[#637588] dark:text-[#92adc9]">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span className="text-xs">Student Union, Room 304</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] dark:border-[#233648] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                        More Info
                      </button>
                    </div>
                  </div>
                </div>

                {/* List Item 3 */}
                <div className="flex flex-row overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] h-40">
                  <div className="w-1/3 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCF6qTnXEMhzq0R_8tUxMIDEK5-3_54rzLgiF9G4MTv_XVnSncTwTQadqVw117NPZC2MZYB3Hp3BlnYqQqBDUNfSotT4e-BmAOELJBgZNefqxsOGE8QR3LGyJFD3cuDoxMLn7b5-J2PNVplLfrBeU3eekpU5HEgdEfnfxnOXHcqIYj8YN2OQGsrj2z989hYrChATPDOJan9rVPRUhHSOG8qrImwZNMyHkWYj2Owj5mBwF065zcMhC7up5HXsBXO_qGnDKXEnmbormM")' }}></div>
                  <div className="flex w-2/3 flex-col p-4 justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Adventure Club</span>
                        <span className="text-xs text-[#637588] dark:text-[#92adc9] font-medium bg-[#f0f2f4] dark:bg-[#233648] px-2 py-0.5 rounded">Nov 18</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#111418] dark:text-white leading-tight">River Gorge Hike</h3>
                      <div className="flex items-center gap-1 mt-2 text-[#637588] dark:text-[#92adc9]">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span className="text-xs">Meeting at North Gate</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] dark:border-[#233648] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                        More Info
                      </button>
                    </div>
                  </div>
                </div>

                {/* List Item 4 */}
                <div className="flex flex-row overflow-hidden rounded-xl bg-white dark:bg-[#1a2632] shadow-sm border border-[#e5e7eb] dark:border-[#233648] h-40">
                  <div className="w-1/3 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAjTj-4YG-k-b3TAD3uF0H0hCsAIoFdlke3c4_NorQILw9V_o9lfrZii4eVFzS9i_OM8X6CIKECmYFGZFUt5SnqJBYqijks1Yl0Px9bttdB--TqnGP6lWgVN7wulH-4ROiKVpox7ONFA7yiSDqkykkyhUA4GI3T0H9qWHhTinCRWzE1k1KFDa0G2ymsWv0sEtWm7A8UeVcAGwTTPmm4WVCChhajjuFh1m0TqxMp8VaijwEJgW5Q5nvpfBePQIuWVnmtBX4hnwyIFxw")' }}></div>
                  <div className="flex w-2/3 flex-col p-4 justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Dev Society</span>
                        <span className="text-xs text-[#637588] dark:text-[#92adc9] font-medium bg-[#f0f2f4] dark:bg-[#233648] px-2 py-0.5 rounded">Nov 20</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#111418] dark:text-white leading-tight">Hackathon Prep</h3>
                      <div className="flex items-center gap-1 mt-2 text-[#637588] dark:text-[#92adc9]">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span className="text-xs">Computer Lab 2</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] dark:border-[#233648] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] dark:text-white hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
                        More Info
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
