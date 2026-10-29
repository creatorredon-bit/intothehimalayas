import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { siteOrigin, setupHint } from '@/lib/env';
import { readableAuthError } from '@/lib/format';
import { fetchProfile, saveProfile, type ProfilePatch } from '@/data/user';
import type { Profile } from '@/lib/types';

interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

interface AuthResult {
  error?: string;
  needsVerification?: boolean;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileLoading: boolean;
  isAdmin: boolean;
  /** Admin or moderator: can publish community announcements. */
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const notConfigured: AuthResult = {
  error: `Accounts are not available yet. ${setupHint}`,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));

  const loadProfile = useCallback(async (current: User | null) => {
    if (!current) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      let row = await fetchProfile(current.id);
      if (!row) {
        // The database trigger normally creates this row; this covers legacy users.
        const fallbackName =
          (current.user_metadata?.full_name as string | undefined)?.trim() ||
          current.email?.split('@')[0] ||
          'Trekker';
        row = await saveProfile(current.id, { fullName: fallbackName });
      }
      setProfile(row);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      void loadProfile(data.session?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void loadProfile(nextSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile, navigate]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: readableAuthError(error.message) };
    return {};
  }, []);

  const signUp = useCallback(async ({ name, email, password }: SignUpInput): Promise<AuthResult> => {
    if (!supabase) return notConfigured;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${siteOrigin()}/login?verified=1`,
      },
    });
    if (error) return { error: readableAuthError(error.message) };
    return { needsVerification: !data.session };
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return {};
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    setProfile(null);
    return {};
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteOrigin()}/reset-password`,
    });
    if (error) return { error: readableAuthError(error.message) };
    return {};
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: readableAuthError(error.message) };
    return {};
  }, []);

  const resendVerification = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${siteOrigin()}/login?verified=1` },
    });
    if (error) return { error: readableAuthError(error.message) };
    return {};
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfilePatch): Promise<AuthResult> => {
      if (!supabase || !user) return notConfigured;
      try {
        const updated = await saveProfile(user.id, patch);
        setProfile(updated);
        if (patch.fullName) {
          await supabase.auth.updateUser({ data: { full_name: patch.fullName } });
        }
        return {};
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save your profile.';
        return { error: message };
      }
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: Boolean(supabase),
      loading,
      user,
      session,
      profile,
      profileLoading,
      isAdmin: profile?.role === 'admin',
      isStaff: profile?.role === 'admin' || profile?.role === 'moderator',
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      resendVerification,
      updateProfile,
      refreshProfile,
    }),
    [
      loading,
      user,
      session,
      profile,
      profileLoading,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      resendVerification,
      updateProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
