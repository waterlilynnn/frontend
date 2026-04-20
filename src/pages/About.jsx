import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronUp, Mail } from 'lucide-react';

const useFadeIn = (threshold = 0.15) => {
  const ref  = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
};

const PROPONENTS = [
  {
    name:    'Angcaya, Carl Andrew P.',
    initials:'CA',
    role:    'Systems Documentation',
    photo:   '/photos/angcaya.jpeg',
    email:   'carl.angcaya@email.com',
    palette: {
      avatar: 'bg-forest-100 text-forest-700',
      border: 'border-forest-200 hover:border-forest-400',
      accent: 'text-forest-600',
    },
  },
  {
    name:    'Herrera, Mark Jordan P.',
    initials:'MH',
    role:    'UI/UX Documentation',
    photo:   '/photos/herrera.jpg',
    email:   'markjordan.herrera@email.com',
    palette: {
      avatar: 'bg-water-100 text-water-700',
      border: 'border-water-200 hover:border-water-500',
      accent: 'text-water-600',
    },
  },
  {
    name:    'Lozano, Niekyla M.',
    initials:'NL',
    role:    'Database Documentation',
    photo:   '/photos/lozano.jpeg',
    email:   'niekyla.lozano@email.com',
    palette: {
      avatar: 'bg-earth-100 text-earth-700',
      border: 'border-earth-200 hover:border-earth-400',
      accent: 'text-earth-600',
    },
  },
  {
    name:    'Morallos, Jefferson M.',
    initials:'JM',
    role:    'Project Finance',
    photo:   null,
    email:   'jefferson.morallos@email.com',
    palette: {
      avatar: 'bg-emerald-100 text-emerald-700',
      border: 'border-emerald-200 hover:border-emerald-400',
      accent: 'text-emerald-600',
    },
  },
  {
    name:    'Uri, April Lyn S.',
    initials:'AU',
    role:    'Lead Developer',
    photo:   '/photos/uri.jpg',
    email:   'april.programming@gmail.com',
    palette: {
      avatar: 'bg-blue-100 text-blue-700',
      border: 'border-blue-200 hover:border-blue-400',
      accent: 'text-blue-600',
    },
  },
];

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop,  setShowTop]  = useState(false);
  const fade = useFadeIn();

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 24);
      setShowTop(window.scrollY > 320);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans" lang="en">

      {/* Navbar */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-forest-100' : 'bg-transparent'
      }`}>
        <nav className="max-w-8xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Link to="/">
              <img src="/cenro-logo.png" alt="CENRO logo" className="h-9 w-auto object-contain" />
            </Link>
          </div>

          {/* Desktop nav buttons — visible on md+ */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-[#0f6e53] border border-[#0f6e53]/40 rounded-lg
                         hover:bg-[#0f6e53]/5 hover:border-[#0f6e53]/70 transition-all duration-200"
            >
              Home
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium bg-[#0f6e53] text-white rounded-lg
                         hover:bg-[#0a6045] transition-colors duration-200 shadow-sm"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile hamburger — visible only on small screens */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile dropdown menu */}
        <div className={`md:hidden bg-white border-b border-gray-100 shadow-md transition-all duration-300 overflow-hidden ${
          menuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-center tracking-wide text-gray-700
                         hover:text-[#0f6e53] hover:bg-[#0f6e53]/5 rounded-lg transition-colors"
            >
              Home
            </Link>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-center tracking-wide text-white
                         bg-[#0f6e53] hover:bg-[#0a6045] rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="pt-3">
        <section className="py-16 sm:py-20 lg:py-28 bg-forest-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">

            {/* Section header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-forest-500">
                About the System
              </h2>
              <div className="mt-2 sm:mt-6 max-w-3xl mx-auto">
                <p className="text-[13px] sm:text-base text-gray-600 leading-relaxed">
                  Developed by five Computer Science students for Tagaytay CENRO,
                  this system streamlines the issuance of environmental management clearances
                  and compliance tracking for Tagaytay City's business establishments.
                </p>
              </div>
            </div>

            {/* Team */}
            <div
              ref={fade.ref}
              className={`transition-all duration-700 ${fade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <div className="text-center mb-5 sm:mb-6">
                <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest text-forest-400">
                  The Team
                </span>
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-forest-500">
                  Meet the Proponents
                </h2>
              </div>

              <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4 lg:gap-5">
                {PROPONENTS.map(({ name, initials, role, photo, email, palette }) => (
                  <div key={name}
                    className={`group bg-white rounded-2xl border ${palette.border}
                      p-3.5 sm:p-4 lg:p-5 flex flex-row sm:flex-col items-center sm:items-center
                      text-left sm:text-center
                      transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md
                      gap-3 sm:gap-0`}>

                    {/* Avatar / photo */}
                    <div className="relative shrink-0">
                      {photo ? (
                        <img src={photo} alt={name}
                             className="w-12 h-12 sm:w-20 lg:w-24 sm:h-20 lg:h-24 rounded-xl object-cover" />
                      ) : (
                        <div className={`w-12 h-12 sm:w-20 lg:w-24 sm:h-20 lg:h-24 rounded-xl ${palette.avatar}
                                         flex items-center justify-center text-sm sm:text-xl lg:text-2xl font-bold select-none`}>
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="mt-0 sm:mt-3 flex-1 min-w-0 sm:w-full">
                      <h3 className="text-xs sm:text-[11px] lg:text-xs font-bold text-gray-800 leading-tight truncate">
                        {name}
                      </h3>
                      <p className={`text-[11px] sm:text-[10px] lg:text-[11px] font-semibold mt-0.5 ${palette.accent}`}>
                        {role}
                      </p>

                      {/* Desktop: divider + email */}
                      <div className="hidden sm:block w-full h-px bg-gray-100 my-2" />
                      <a href={`mailto:${email}`}
                         className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-gray-400
                                    hover:text-forest-600 transition-colors max-w-full">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{email.split('@')[0]}</span>
                      </a>
                    </div>

                    {/* Mobile: mail icon */}
                    <a href={`mailto:${email}`}
                       className="sm:hidden ml-auto shrink-0 text-gray-400 hover:text-forest-600 transition-colors">
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-3 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} EMC System — City Government of Tagaytay. All rights reserved.
          </p>
          <p className="text-xs italic text-gray-400">Better, Cleaner, &amp; Greener Tagaytay</p>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-forest-500 text-white
                    flex items-center justify-center shadow-md hover:bg-forest-600
                    transition-all duration-300
                    ${showTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
        <ChevronUp className="h-5 w-5" />
      </button>
    </div>
  );
}