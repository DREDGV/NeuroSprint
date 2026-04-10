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
  deleteAccount: () => Promise<void>;
  updateAccountProfile: (payload: { displayName?: string; email?: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  syncAccountData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const RECOVERY_PARAM_KEYS = [
  "type",
  "token",
  "token_hash",
  "access_token",
  "refresh_token",
  "code"
] as const;

function hasRecoveryParamsInUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const isRecoveryType =
    searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";

  return (
    isRecoveryType ||
    RECOVERY_PARAM_KEYS.some((key) => searchParams.has(key) || hashParams.has(key))
  );
}

function getAuthCodeFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("code");
}

function clearRecoveryParamsFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;

  for (const key of RECOVERY_PARAM_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (window.location.hash) {
    changed = true;
  }

  if (!changed) {
    return;
  }

  const nextSearch = url.searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
  window.history.replaceState({}, document.title, nextUrl);
}

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
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => hasRecoveryParamsInUrl());
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const client = supabase;
    let active = true;

    async function bootstrapSession() {
      const recoveryInUrl = hasRecoveryParamsInUrl();
      if (recoveryInUrl) {
        setIsRecoveryMode(true);
      }

      const authCode = getAuthCodeFromUrl();
      if (authCode) {
        const { error } = await client.auth.exchangeCodeForSession(authCode);
        if (error) {
          console.error("auth code exchange failed", error);
        }
      }

      const { data, error } = await client.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        console.error("auth session bootstrap failed", error);
      }

      setSession(data.session ?? null);
      setIsRecoveryMode(recoveryInUrl || hasRecoveryParamsInUrl());
      setIsLoading(false);
    }

    void bootstrapSession().catch((error) => {
      console.error("auth session bootstrap crashed", error);
      if (active) {
        setIsLoading(false);
      }
    });

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setIsRecoveryMode(event === "PASSWORD_RECOVERY" || hasRecoveryParamsInUrl());
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
      setSyncError(toAuthUiError(error, "Не удалось обновить данные аккаунта."));
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
    const { data, error } = await client.auth.signInWithPassword({ email, password });

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

  const deleteAccount = useCallback(async () => {
    throw new Error(
      "Удаление аккаунта через сайт пока недоступно. Напишите в поддержку — поможем удалить аккаунт вручную."
    );
  }, []);

  const updateAccountProfile = useCallback(
    async (payload: { displayName?: string; email?: string }) => {
      const client = requireSupabaseClient();
      const nextDisplayName = payload.displayName?.trim();
      const nextEmail = payload.email?.trim().toLowerCase();
      const currentEmail = session?.user?.email?.trim().toLowerCase();

      if (!nextDisplayName && !nextEmail) {
        return;
      }

      const updatePayload: {
        email?: string;
        data?: {
          display_name: string | null;
        };
      } = {};

      if (typeof payload.displayName !== "undefined") {
        updatePayload.data = {
          display_name: nextDisplayName ?? null
        };
      }

      if (nextEmail && nextEmail !== currentEmail) {
        updatePayload.email = nextEmail;
      }

      const { data, error } = await client.auth.updateUser(updatePayload);

      if (error) {
        throw new Error(toAuthUiError(error, "Не удалось обновить данные аккаунта."));
      }

      if (session?.user) {
        const authUser = data.user ?? session.user;
        const { error: dbError } = await client.from("accounts").upsert({
          id: authUser.id,
          email: authUser.email ?? null,
          display_name:
            typeof authUser.user_metadata?.display_name === "string"
              ? authUser.user_metadata.display_name
              : nextDisplayName ?? null
        });

        if (dbError) {
          console.warn("Failed to update public.accounts:", dbError);
        }
      }

      const { data: refreshedSession } = await client.auth.getSession();
      setSession(refreshedSession.session ?? session);
    },
    [session]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const client = requireSupabaseClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/forgot-password`
        : undefined;

    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw new Error(toAuthUiError(error, "Не удалось отправить письмо для сброса пароля."));
    }

    trackPasswordResetRequested();
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      throw new Error(toAuthUiError(error, "Не удалось обновить пароль."));
    }

    clearRecoveryParamsFromUrl();
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
      deleteAccount,
      updateAccountProfile,
      requestPasswordReset,
      updatePassword,
      syncAccountData
    }),
    [
      deleteAccount,
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
      updateAccountProfile,
      updatePassword
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("AuthContext is not available");
  }
  return value;
}
