import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SiteRole = "user" | "moderator" | "admin";
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ServerDatabase = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          display_name: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
        };
      };
      account_access: {
        Row: {
          account_id: string;
          site_role: SiteRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          site_role?: SiteRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          site_role?: SiteRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          description: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          enabled?: boolean;
          description: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          enabled?: boolean;
          description?: string;
          updated_at?: string;
        };
      };
      feedback_entries: {
        Row: {
          id: string;
          submitter_kind: string;
          account_id: string | null;
          training_profile_id: string | null;
          guest_token_hash: string | null;
          source_surface: string;
          category: string;
          module_id: string | null;
          mode_id: string | null;
          route: string | null;
          sentiment: string | null;
          star_rating: number | null;
          reasons: string[] | null;
          comment: string;
          contact_email: string | null;
          client_context: Json | null;
          review_status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          submitter_kind: string;
          account_id?: string | null;
          training_profile_id?: string | null;
          guest_token_hash?: string | null;
          source_surface: string;
          category: string;
          module_id?: string | null;
          mode_id?: string | null;
          route?: string | null;
          sentiment?: string | null;
          star_rating?: number | null;
          reasons?: string[] | null;
          comment: string;
          contact_email?: string | null;
          client_context?: Json | null;
          review_status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          submitter_kind?: string;
          account_id?: string | null;
          training_profile_id?: string | null;
          guest_token_hash?: string | null;
          source_surface?: string;
          category?: string;
          module_id?: string | null;
          mode_id?: string | null;
          route?: string | null;
          sentiment?: string | null;
          star_rating?: number | null;
          reasons?: string[] | null;
          comment?: string;
          contact_email?: string | null;
          client_context?: Json | null;
          review_status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      idea_posts: {
        Row: {
          id: string;
          author_account_id: string;
          author_profile_id: string | null;
          title: string;
          body: string;
          category: string;
          moderation_status: string;
          roadmap_status: string;
          rejection_note: string | null;
          vote_count: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          author_account_id: string;
          author_profile_id?: string | null;
          title: string;
          body: string;
          category: string;
          moderation_status?: string;
          roadmap_status?: string;
          rejection_note?: string | null;
          vote_count?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          author_account_id?: string;
          author_profile_id?: string | null;
          title?: string;
          body?: string;
          category?: string;
          moderation_status?: string;
          roadmap_status?: string;
          rejection_note?: string | null;
          vote_count?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      idea_votes: {
        Row: {
          id: string;
          idea_id: string;
          account_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          idea_id: string;
          account_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          idea_id?: string;
          account_id?: string;
          created_at?: string | null;
        };
      };
    };
  };
};

function resolveServerSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return { supabaseUrl, supabaseServiceKey };
}

let cachedAdminClient: SupabaseClient<ServerDatabase> | null = null;

export function getSupabaseAdmin() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const { supabaseUrl, supabaseServiceKey } = resolveServerSupabaseConfig();
  cachedAdminClient = createClient<ServerDatabase>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedAdminClient;
}

export function requireAuth(token: string | undefined): { userId: string } {
  if (!token) {
    throw new Error("Unauthorized");
  }

  // Extract bearer token
  const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;

  // Verify token via Supabase
  // In Vercel Functions, we can use the service client to verify
  // The getUser method will validate the JWT
  throw new Error("Token verification requires runtime auth helper");
}

export async function verifyAuthToken(token: string | undefined): Promise<string | null> {
  if (!token) {
    return null;
  }

  const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(rawToken);
    if (error || !data.user) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

function normalizeSiteRole(value: unknown): SiteRole {
  if (value === "admin" || value === "moderator" || value === "user") {
    return value;
  }
  return "user";
}

export async function getAccountSiteRole(accountId: string): Promise<SiteRole> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("account_access")
      .select("site_role")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      console.error("account_access lookup failed", error);
      return "user";
    }

    return normalizeSiteRole(data?.site_role);
  } catch (error) {
    console.error("site role lookup crashed", error);
    return "user";
  }
}

export async function verifyModeratorToken(
  token: string | undefined
): Promise<{ accountId: string; siteRole: SiteRole } | null> {
  const accountId = await verifyAuthToken(token);
  if (!accountId) {
    return null;
  }

  const siteRole = await getAccountSiteRole(accountId);
  if (siteRole !== "moderator" && siteRole !== "admin") {
    return null;
  }

  return { accountId, siteRole };
}
