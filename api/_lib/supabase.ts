import { createClient } from "@supabase/supabase-js";

type SiteRole = "user" | "moderator" | "admin";

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

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const { supabaseUrl, supabaseServiceKey } = resolveServerSupabaseConfig();
  cachedAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
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
