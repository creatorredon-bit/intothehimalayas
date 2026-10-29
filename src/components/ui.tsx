import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon } from './Icons';
import { cx } from '@/lib/cx';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingRow({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-ink-muted" role="status">
      <Spinner className="h-4 w-4 text-forest" />
      <span>{label}…</span>
    </div>
  );
}

export function TrailCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export function TrailGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <TrailCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container-page space-y-6 py-12" aria-hidden="true">
      <div className="skeleton h-3 w-40" />
      <div className="skeleton h-10 w-2/3" />
      <div className="skeleton aspect-[16/7] w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = 'compass',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-xl">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-red-100 bg-red-50/40 px-6 py-10">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">That did not load</h3>
          <p className="mt-1 break-words text-sm leading-relaxed text-ink-muted">{message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {onRetry && (
              <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
                <Icon name="refresh" className="h-4 w-4" />
                Try again
              </button>
            )}
            <Link to="/help" className="btn-ghost btn-sm">
              Troubleshooting help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const noticeStyles = {
  info: 'border-sky/40 bg-sky/10 text-[#1c5a70]',
  warning: 'border-gold/50 bg-gold/10 text-[#7a5207]',
  success: 'border-forest-200 bg-forest-50 text-forest-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-stone-line bg-white text-ink-muted',
} as const;

export function Notice({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof noticeStyles;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('rounded-xl border px-4 py-3.5 text-sm', noticeStyles[tone], className)}>
      <div className="flex items-start gap-3">
        <Icon
          name={tone === 'error' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : 'info'}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className={cx('leading-relaxed', title && 'mt-0.5')}>{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-6', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-stone-line/80 bg-mint">
      <div className="container-page py-10 sm:py-14">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-3xl leading-[1.1] sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-ink-muted">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-lift outline-none animate-fade-up sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-sm',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-3xl',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl leading-snug">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-full p-2 text-ink-faint transition hover:bg-stone-paper hover:text-ink"
            aria-label="Close dialog"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => windowStart + index).filter(
    (value) => value <= totalPages,
  );

  return (
    <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Pagination">
      <button
        type="button"
        className="btn-secondary btn-sm disabled:opacity-40"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <Icon name="chevronLeft" className="h-4 w-4" />
        Previous
      </button>
      <div className="flex items-center gap-1.5">
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onChange(value)}
            className={cx(
              'h-9 min-w-9 rounded-full px-2 text-sm font-semibold transition',
              value === page
                ? 'bg-forest text-white'
                : 'text-ink-muted hover:bg-forest-50 hover:text-forest-700',
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-secondary btn-sm disabled:opacity-40"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <Icon name="chevronRight" className="h-4 w-4" />
      </button>
    </nav>
  );
}

export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#7a5207]',
        className,
      )}
      title="Sample data included with this project — not a verified commercial listing or survey-grade route."
    >
      Sample data
    </span>
  );
}

export function MetaItem({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
      <div className="min-w-0">
        <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
