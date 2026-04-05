import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { AccountProfile } from "../shared/types/account";
import { accountSyncService } from "../entities/account/accountSyncService";
import {
  getSupabasePublicStatusMessage,
  isSupabaseConfigured,
  requireSupabaseClient,
  supabase
} from "../shared/lib/auth/supabaseClient";
import { toAuthUiError } from "../shared/lib/auth/authUiMessages";
import {
  trackAccountRegistered,
  trackLoginSucceeded,
  trackLogoutSucceeded,
  trackPasswordResetRequested
} from "../shared/lib/analytics/siteAnalytics";

interface AuthContextValue {
  session: Session | null;
  account: AccountProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isRecoveryMode: boolean;
  syncInProgress: boolean;
  syncError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  syncAccountData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAccount(authUser: SupabaseAuthUser | null): AccountProfile | null {
  if (!authUser) {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email ?? null,
    displayName:
      typeof authUser.user_metadata?.display_name === "string"
        ? authUser.user_metadata.display_name
        : null,
    createdAt: authUser.created_at ?? null,
    lastSignInAt: authUser.last_sign_in_at ?? null
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          console.error("auth session bootstrap failed", error);
        }
        setSession(data.session ?? null);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("auth session bootstrap crashed", error);
        if (active) {
          setIsLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setIsRecoveryMode(event === "PASSWORD_RECOVERY");
      setIsLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const syncAccountData = useCallback(async () => {
    if (!session?.user || !isSupabaseConfigured) {
      return;
    }

    setSyncInProgress(true);
    setSyncError(null);
    try {
      await accountSyncService.ensureAccountRecord(session.user);
      await accountSyncService.pullAccountState(session.user.id);
      await accountSyncService.syncAllLinkedProfiles(session.user.id);
    } catch (error) {
      console.error("account sync failed", error);
      setSyncError(toAuthUiError(error, "Не удалось синхронизировать аккаунт."));
    } finally {
      setSyncInProgress(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) {
      return;
    }

    void syncAccountData();
  }, [session?.user, syncAccountData]);

  const login = useCallback(async (email: string, password: string) => {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(toAuthUiError(error, "Не удалось выполнить вход."));
    }

    setSession(data.session ?? null);
    trackLoginSucceeded();
  }, []);

  const register = useCallback(
    async (payload: { email: string; password: string; displayName?: string }) => {
      const client = requireSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            display_name: payload.displayName ?? null
          }
        }
      });

      if (error) {
        throw new Error(toAuthUiError(error, "Не удалось создать аккаунт."));
      }

      setSession(data.session ?? null);
      trackAccountRegistered();
    },
    []
  );

  const logout = useCallback(async () => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw new Error(toAuthUiError(error, "Не удалось выйти из аккаунта."));
    }

    setSession(null);
    setIsRecoveryMode(false);
    trackLogoutSucceeded();
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const client = requireSupabaseClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/forgot-password`
        : undefined;

    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw new Error(
        toAuthUiError(error, "Не удалось отправить письмо для сброса пароля.")
      );
    }

    trackPasswordResetRequested();
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      throw new Error(toAuthUiError(error, "Не удалось обновить пароль."));
    }

    setIsRecoveryMode(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      account: mapAccount(session?.user ?? null),
      isAuthenticated: Boolean(session?.user),
      isLoading,
      isConfigured: isSupabaseConfigured,
      isRecoveryMode,
      syncInProgress,
      syncError: !isSupabaseConfigured ? getSupabasePublicStatusMessage() : syncError,
      login,
      register,
      logout,
      requestPasswordReset,
      updatePassword,
      syncAccountData
    }),
    [
      isLoading,
      isRecoveryMode,
      login,
      logout,
      register,
      requestPasswordReset,
      session,
      syncAccountData,
      syncError,
      syncInProgress,
      updatePassword
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
