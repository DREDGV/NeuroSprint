import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getSupabaseConfigError(): string {
  return "Supabase не настроен. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";
}

export function getSupabasePublicStatusMessage(): string {
  return "Сервис аккаунтов ещё подключается. Пока можно пользоваться локальными профилями на этом устройстве.";
}

export function requireSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(getSupabaseConfigError());
  }
  return supabase;
}
