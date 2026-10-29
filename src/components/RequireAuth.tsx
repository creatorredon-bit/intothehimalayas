import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { setupHint } from '@/lib/env';
import { Spinner } from './ui';
import { Icon } from './Icons';

export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading, profileLoading, configured, isAdmin } = useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <div className="container-page py-20">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl">Accounts need a Supabase project</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Authentication is not simulated in this build. {setupHint} Then run the SQL in
            <code className="mx-1 rounded bg-stone-paper px-1.5 py-0.5 text-xs">supabase/migrations</code> and reload.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/help#setup" className="btn-primary">
              Setup instructions
            </Link>
            <Link to="/explore" className="btn-secondary">
              Browse trails instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || (user && profileLoading)) {
    return (
      <div className="container-page flex min-h-[40vh] items-center justify-center py-20" role="status">
        <Spinner className="h-7 w-7 text-forest" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="container-page py-20">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-[#7a5207]">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl">Admin access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            You are signed in, but this account does not have the admin role. Roles are enforced by Row Level
            Security in the database — the menu item being hidden is not the security boundary.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="btn-primary">
              Go to your dashboard
            </Link>
            <Link to="/help#admin" className="btn-secondary">
              How admin roles work
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
