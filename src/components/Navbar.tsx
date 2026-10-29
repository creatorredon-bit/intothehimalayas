import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useSavedTrails } from '@/saved/SavedTrailsProvider';
import { initials } from '@/lib/format';
import { cx } from '@/lib/cx';
import { Icon } from './Icons';

const links = [
  { to: '/explore', label: 'Explore' },
  { to: '/destinations', label: 'Destinations' },
  { to: '/guides', label: 'Guides & stays' },
  { to: '/plan', label: 'Trip planner' },
  { to: '/community', label: 'Community' },
];

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { count } = useSavedTrails();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/';
  const transparent = isHome && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const handleSignOut = async () => {
    await signOut();
    setAccountOpen(false);
    navigate('/');
  };

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-[900] transition-colors duration-300',
        transparent
          ? 'bg-transparent text-white'
          : 'border-b border-stone-line/70 bg-mint/95 text-ink backdrop-blur-md',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 sm:h-20">
        <Link
          to="/"
          className="group flex items-center gap-2.5"
          aria-label="IntotheHimalayas home"
          onClick={() => setMenuOpen(false)}
        >
          <span
            className={cx(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
              transparent ? 'bg-white/15 text-white' : 'bg-forest text-white',
            )}
          >
            <Icon name="mountain" className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[1.05rem] tracking-[-0.01em]">IntotheHimalayas</span>
            <span
              className={cx(
                'mt-1 hidden text-[0.6rem] font-semibold uppercase tracking-[0.24em] sm:block',
                transparent ? 'text-white/70' : 'text-forest-600',
              )}
            >
              Nepal, on foot
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cx(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition',
                  isActive
                    ? transparent
                      ? 'bg-white/15 text-white'
                      : 'bg-forest-50 text-forest-800'
                    : transparent
                      ? 'text-white/85 hover:bg-white/10 hover:text-white'
                      : 'text-ink-soft hover:bg-forest-50 hover:text-forest-800',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            to="/saved"
            className={cx(
              'relative hidden items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition sm:inline-flex',
              transparent ? 'text-white/90 hover:bg-white/10' : 'text-ink-soft hover:bg-forest-50',
            )}
          >
            <Icon name="heart" className="h-[1.15rem] w-[1.15rem]" />
            <span className="hidden xl:inline">Saved</span>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[0.6rem] font-bold text-ink">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className={cx(
                  'flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm font-medium transition sm:pr-3',
                  transparent ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-ink ring-1 ring-stone-line hover:bg-forest-50',
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-[0.7rem] font-bold text-white">
                  {initials(profile?.fullName || user.email || 'You')}
                </span>
                <span className="hidden max-w-24 truncate sm:inline">
                  {profile?.fullName?.split(' ')[0] || 'Account'}
                </span>
                <Icon name="chevronDown" className="h-3.5 w-3.5" />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-stone-line bg-white py-1.5 text-ink shadow-lift animate-fade-in"
                >
                  <div className="border-b border-stone-line px-4 py-3">
                    <p className="truncate text-sm font-semibold">{profile?.fullName || 'Trekker'}</p>
                    <p className="truncate text-xs text-ink-faint">{user.email}</p>
                  </div>
                  <Link role="menuitem" to="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-forest-50">
                    <Icon name="user" className="h-4 w-4 text-ink-faint" /> Dashboard
                  </Link>
                  <Link role="menuitem" to="/saved" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-forest-50">
                    <Icon name="heart" className="h-4 w-4 text-ink-faint" /> Saved trails
                  </Link>
                  <Link role="menuitem" to="/plan" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-forest-50">
                    <Icon name="calendar" className="h-4 w-4 text-ink-faint" /> Trips
                  </Link>
                  <Link role="menuitem" to="/split" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-forest-50">
                    <Icon name="wallet" className="h-4 w-4 text-ink-faint" /> Split costs
                  </Link>
                  <Link role="menuitem" to="/live" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-forest-50">
                    <Icon name="compass" className="h-4 w-4 text-ink-faint" /> Live GPS
                  </Link>
                  {isAdmin && (
                    <Link role="menuitem" to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-forest-50">
                      <Icon name="shield" className="h-4 w-4 text-ink-faint" /> Admin
                    </Link>
                  )}
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 border-t border-stone-line px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Icon name="logout" className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className={cx(
                  'hidden rounded-full px-3.5 py-2 text-sm font-medium transition sm:inline-flex',
                  transparent ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:bg-forest-50',
                )}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className={cx(
                  'btn btn-sm sm:btn',
                  transparent ? 'bg-white text-forest-800 hover:bg-white/90' : 'bg-forest text-white hover:bg-forest-700',
                )}
              >
                Join free
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={cx(
              'ml-1 rounded-full p-2 transition lg:hidden',
              transparent ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-forest-50',
            )}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-navigation" className="border-t border-stone-line bg-mint lg:hidden">
          <nav aria-label="Mobile navigation" className="container-page flex flex-col py-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-lg px-3 py-3 text-base font-medium',
                    isActive ? 'bg-forest-50 text-forest-800' : 'text-ink-soft hover:bg-forest-50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/split" className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-forest-50">
              Split costs
            </NavLink>
            <NavLink to="/live" className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-forest-50">
              Live GPS
            </NavLink>
            <NavLink to="/saved" className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-forest-50">
              Saved trails {count > 0 ? `(${count})` : ''}
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-forest-50">
                  Dashboard
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-forest-50">
                    Admin
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg px-3 py-3 text-left text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3 px-1">
                <Link to="/login" className="btn-secondary">
                  Sign in
                </Link>
                <Link to="/signup" className="btn-primary">
                  Join free
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
