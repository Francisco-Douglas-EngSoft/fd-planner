import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearOfflineUser, getOfflineUser, saveOfflineUser } from '@/lib/offline/offlineUser';
import { clearOfflineReadCache } from '@/lib/offline/install';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  enterAsGuest: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Mantém o mesmo objeto quando nada mudou, evitando recarregar as telas a cada renovação do token. */
function sameUser(a: User | null, b: User | null): boolean {
  if (!a || !b) return a === b;
  return a.id === b.id && a.updated_at === b.updated_at && a.email === b.email;
}

function isNetworkAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; status?: number };
  return e.name === 'AuthRetryableFetchError' || e.status === 0 || (typeof e.status === 'number' && e.status >= 500);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Quem já entrou neste aparelho abre o app na hora; a sessão é confirmada em segundo plano
  // (se tiver expirado de vez, getSession abaixo devolve null e a pessoa vai para o login).
  const [user, setUserState] = useState<User | null>(() => getOfflineUser());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => getOfflineUser() === null);
  const [isGuest, setIsGuest] = useState(() => {
    return sessionStorage.getItem('fdplanner_guest_mode') === 'true';
  });

  const setUser = (next: User | null) => setUserState((prev) => (sameUser(prev, next) ? prev : next));

  useEffect(() => {
    const applySession = (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) saveOfflineUser(s.user);
      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearOfflineUser();
          void clearOfflineReadCache();
        }
        // Sem internet a renovação do token falha: quem decide é o getSession abaixo.
        if (event === 'INITIAL_SESSION' && !session && getOfflineUser()) return;
        applySession(session);
        // Exit guest mode if user logs in
        if (session?.user) {
          setIsGuest(false);
          sessionStorage.removeItem('fdplanner_guest_mode');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      const cached = getOfflineUser();
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (!session && cached && (offline || isNetworkAuthError(error))) {
        // Já entrou antes neste aparelho: abre direto, sem depender do servidor de login.
        setSession(null);
        setUser(cached);
        setLoading(false);
        return;
      }
      applySession(session);
    }).catch(() => {
      const cached = getOfflineUser();
      setUser(cached);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const enterAsGuest = () => {
    setIsGuest(true);
    sessionStorage.setItem('fdplanner_guest_mode', 'true');
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    sessionStorage.removeItem('fdplanner_guest_mode');
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    exitGuestMode();
    clearOfflineUser();
    void clearOfflineReadCache();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isGuest,
      signUp, 
      signIn, 
      signOut, 
      resetPassword, 
      updatePassword,
      enterAsGuest,
      exitGuestMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
