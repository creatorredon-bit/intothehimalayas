import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { setupHint } from '@/lib/env';
import { isValidEmail } from '@/lib/format';
import { photos } from '@/lib/images';
import { Field, Notice, Spinner } from '@/components/ui';

function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-sm text-ink-muted">{footer}</div>}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img
          src={photos.everestSunset}
          alt="Sunset light on Everest seen from the Khumbu"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/35" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="font-display text-2xl leading-snug">
            “The mountains are not a checklist. Take the extra day.”
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/70">Field note, Khumbu</p>
        </div>
      </div>
    </div>
  );
}

function ConfigNotice() {
  const { configured } = useAuth();
  if (configured) return null;
  return (
    <Notice tone="warning" className="mb-5" title="Accounts are not configured in this build">
      {setupHint} Authentication is intentionally not simulated — sign-up, sign-in and password reset all talk
      directly to Supabase Auth.{' '}
      <Link to="/help#setup" className="font-semibold underline">
        Setup guide
      </Link>
    </Notice>
  );
}

/* -------------------------------------------------------------------------- */
/* Login                                                                      */
/* -------------------------------------------------------------------------- */

export function LoginPage() {
  const { signIn, user, loading, configured } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const next = searchParams.get('next') || '/dashboard';
  const verified = searchParams.get('verified') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, navigate, next, user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    push('Signed in.', 'success');
    navigate(next, { replace: true });
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your trail library"
      description="Saved routes, trips, review drafts and inquiries are tied to your account."
      footer={
        <>
          New here?{' '}
          <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-forest-700 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <ConfigNotice />
      {verified && (
        <Notice tone="success" className="mb-5" title="Email confirmed">
          Your address is verified. Sign in to continue.
        </Notice>
      )}
      {!configured && (
        <Notice tone="neutral" className="mb-5">
          You can still browse the trail directory and build a device-local trip while accounts are unavailable.
        </Notice>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <div className="flex items-center justify-between text-xs">
          <Link to="/forgot-password" className="font-semibold text-forest-700 hover:underline">
            Forgot your password?
          </Link>
          <Link to="/help#auth" className="text-ink-faint hover:text-forest-700">
            Sign-in help
          </Link>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Sign up                                                                    */
/* -------------------------------------------------------------------------- */

export function SignupPage() {
  const { signUp, user, loading, configured } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const next = searchParams.get('next') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, navigate, next, user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError('Enter the name you want on your account.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    if (password !== confirm) return setError('The passwords do not match.');
    if (!accepted) return setError('Please accept the terms and privacy policy.');

    setSubmitting(true);
    const result = await signUp({ name: name.trim(), email: email.trim(), password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsVerification) {
      navigate('/verify-email', { state: { email: email.trim() } });
      return;
    }
    push('Account created.', 'success');
    navigate(next, { replace: true });
  };

  return (
    <AuthShell
      eyebrow="Join"
      title="Save what fits. Plan it properly."
      description="A free account keeps your saved trails, collections, trips and reviews in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-forest-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ConfigNotice />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" htmlFor="signup-name">
          <input
            id="signup-name"
            className="input"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="Email" htmlFor="signup-email">
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="signup-password" hint="8+ characters.">
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirm password" htmlFor="signup-confirm">
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              required
            />
          </Field>
        </div>
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-stone-line text-forest focus:ring-forest"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            I accept the{' '}
            <Link to="/terms" className="font-semibold text-forest-700 underline">
              terms of use
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-semibold text-forest-700 underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={submitting || !configured}>
          {submitting && <Spinner className="h-4 w-4" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        {!configured && (
          <p className="text-center text-xs text-ink-faint">
            Account creation is disabled until Supabase credentials are configured.
          </p>
        )}
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          We send one verification email. No marketing email, no newsletter.
        </p>
      </form>
    </AuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Verify email                                                               */
/* -------------------------------------------------------------------------- */

export function VerifyEmailPage() {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email ?? '';
  const { resendVerification, configured } = useAuth();
  const [email, setEmail] = useState(stateEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const onResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!isValidEmail(email)) return setError('Enter the email address you signed up with.');
    setSending(true);
    const result = await resendVerification(email);
    setSending(false);
    if (result.error) setError(result.error);
    else setMessage('Verification email sent. Check your inbox and spam folder.');
  };

  return (
    <AuthShell
      eyebrow="Almost there"
      title="Confirm your email address"
      description="We sent a verification link when you signed up. Click it, then sign in — this keeps account recovery working."
      footer={
        <>
          Already confirmed?{' '}
          <Link to="/login" className="font-semibold text-forest-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {!configured && <ConfigNotice />}
      {message && (
        <Notice tone="success" className="mb-5">
          {message}
        </Notice>
      )}
      {error && (
        <Notice tone="error" className="mb-5">
          {error}
        </Notice>
      )}
      <form onSubmit={onResend} className="space-y-4">
        <Field label="Email" htmlFor="verify-email">
          <input
            id="verify-email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <button type="submit" className="btn-secondary w-full" disabled={sending || !configured}>
          {sending && <Spinner className="h-4 w-4" />}
          Resend verification email
        </button>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-ink-faint">
        Links expire. If yours has, resend it above. The redirect returns to this site's login page.
      </p>
    </AuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Forgot password                                                            */
/* -------------------------------------------------------------------------- */

export function ForgotPasswordPage() {
  const { sendPasswordReset, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    setSubmitting(true);
    const result = await sendPasswordReset(email);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email and we will send a reset link. The link opens the reset page on this site."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-forest-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ConfigNotice />
      {sent ? (
        <Notice tone="success" title="Check your email">
          If an account exists for {email}, a reset link is on its way. The link expires; request another if needed.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" htmlFor="forgot-email">
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={submitting || !configured}>
            {submitting && <Spinner className="h-4 w-4" />} Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Reset password                                                             */
/* -------------------------------------------------------------------------- */

export function ResetPasswordPage() {
  const { user, updatePassword, loading } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  // Supabase parses the recovery tokens after the first render. Give it a
  // moment before telling someone their link is dead.
  useEffect(() => {
    const timer = window.setTimeout(() => setCheckingLink(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!loading && !user && !done && checkingLink) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Checking your reset link"
        description="Hold on while we verify the recovery token with Supabase."
      >
        <div className="flex items-center gap-3 rounded-xl border border-stone-line bg-white px-4 py-5 text-sm text-ink-muted" role="status">
          <Spinner className="h-4 w-4 text-forest" />
          Verifying the link…
        </div>
      </AuthShell>
    );
  }

  if (!loading && !user && !done) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="This reset link is not active"
        description="The link may have expired or already been used. Request a fresh one — it takes a minute."
        footer={
          <Link to="/forgot-password" className="font-semibold text-forest-700 hover:underline">
            Request a new reset link
          </Link>
        }
      >
        <Notice tone="warning" title="No recovery session found">
          Reset links are single-use and time-limited. Open the most recent email on this device, or request another
          link.
        </Notice>
      </AuthShell>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    push('Password updated. You are signed in.', 'success');
    navigate('/dashboard');
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="You are signed in through a recovery link. Setting a new password signs you out of other sessions."
      footer={
        <Link to="/help#auth" className="font-semibold text-forest-700 hover:underline">
          Password and account help
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="New password" htmlFor="reset-password" hint="At least 8 characters.">
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirm new password" htmlFor="reset-confirm">
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={8}
            required
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />} Update password
        </button>
      </form>
    </AuthShell>
  );
}
