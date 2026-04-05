/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ALLOW_PRIVILEGED_PROFILE_ROLES?: string;
  readonly VITE_ONLINE_COMPETITIONS?: string;
  readonly VITE_FEATURE_CLASSES_UI?: string;
  readonly VITE_FEATURE_COMPETITIONS_UI?: string;
  readonly VITE_FEATURE_GROUP_STATS_UI?: string;
  readonly VITE_FEATURE_ONLINE_COMPETITIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
