import { createClient } from "@supabase/supabase-js";

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
