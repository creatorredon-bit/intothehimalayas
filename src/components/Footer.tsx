import { Link } from 'react-router-dom';
import { contentSource } from '@/data/content';
import { Icon } from './Icons';

const columns = [
  {
    title: 'Explore',
    links: [
      { to: '/explore', label: 'All trails' },
      { to: '/explore?difficulty=easy', label: 'Beginner routes' },
      { to: '/destinations', label: 'Destinations' },
      { to: '/guides', label: 'Guides' },
      { to: '/stays', label: 'Mountain stays' },
    ],
  },
  {
    title: 'Plan',
    links: [
      { to: '/plan', label: 'Trip planner' },
      { to: '/split', label: 'Split costs' },
      { to: '/live', label: 'Live GPS' },
      { to: '/saved', label: 'Saved trails' },
      { to: '/dashboard', label: 'Your dashboard' },
    ],
  },
  {
    title: 'Community',
    links: [
      { to: '/community', label: 'Announcements' },
      { to: '/help#permits', label: 'Permits & safety' },
      { to: '/help', label: 'Help centre' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/terms', label: 'Terms of use' },
      { to: '/about#credits', label: 'Photo credits' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-line bg-white">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-white">
                <Icon name="mountain" className="h-5 w-5" />
              </span>
              <span className="font-display text-lg">IntotheHimalayas</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              An independent guide to trekking and hiking in Nepal. Routes, altitudes and permit notes are written to
              be checked — not trusted blindly.
            </p>
            <p className="mt-5 text-xs leading-relaxed text-ink-faint">
              Content source: {contentSource === 'supabase' ? 'live Supabase project' : 'sample dataset bundled with this build'}.
              Trail distances and altitudes follow published route descriptions; map lines are illustrative.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  {column.title}
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.to + link.label}>
                      <Link to={link.to} className="text-sm text-ink-soft transition hover:text-forest-700">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-stone-line pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} IntotheHimalayas. Independent project, Kathmandu &amp; London.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Maps © OpenStreetMap contributors</span>
            <span aria-hidden="true">·</span>
            <span>Photography via Wikimedia Commons</span>
            <span aria-hidden="true">·</span>
            <Link to="/help#setup" className="hover:text-forest-700">
              Status &amp; setup
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
