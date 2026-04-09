import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { supabaseAdmin, verifyAuthToken } from "./_lib/supabase";

const GUEST_HASH_SECRET = process.env.FEEDBACK_GUEST_HASH_SECRET || "dev-secret-change-in-production";
const MAX_COMMENT_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_REASONS = 5;
const MAX_REASON_LENGTH = 100;
const GUEST_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const GUEST_MAX_SUBMISSIONS = 3;

function hashGuestToken(token: string): string {
  return crypto.createHmac("sha256", GUEST_HASH_SECRET).update(token).digest("hex");
}

function trimAndValidateString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
}

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = req.body;

    // Honeypot check
    if (body._website || body._honeypot) {
      return jsonResponse(res, 200, { success: true }); // Silent accept for bots
    }

    // Validate required fields
    const category = body.category;
    const validCategories = ["bug", "ux", "idea", "question", "praise"];
    if (!validCategories.includes(category)) {
      return jsonResponse(res, 400, { error: "Invalid category" });
    }

    const sourceSurface = body.source_surface;
    const validSurfaces = ["post_session", "global_form"];
    if (!validSurfaces.includes(sourceSurface)) {
      return jsonResponse(res, 400, { error: "Invalid source surface" });
    }

    const comment = trimAndValidateString(body.comment, MAX_COMMENT_LENGTH);
    if (!comment) {
      return jsonResponse(res, 400, { error: "Comment is required" });
    }

    // Star rating validation (optional)
    let starRating: number | null = null;
    if (body.star_rating != null) {
      const rating = Number(body.star_rating);
      if (Number.isInteger(rating) && rating >= 1 && rating <= 10) {
        starRating = rating;
      }
    }

    // Reasons validation
    let reasons: string[] = [];
    if (Array.isArray(body.reasons)) {
      reasons = body.reasons
        .filter((r: unknown) => typeof r === "string")
        .map((r: string) => trimAndValidateString(r, MAX_REASON_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_REASONS);
    }

    // Contact email (optional)
    const contactEmail = body.contact_email
      ? trimAndValidateString(body.contact_email, MAX_EMAIL_LENGTH)
      : null;

    // Determine submitter kind
    const authHeader = req.headers.authorization;
    const accountId = await verifyAuthToken(authHeader);

    const submitterKind = accountId ? "account" : "guest";

    // Guest rate limiting via duplicate check
    let guestTokenHash: string | null = null;
    if (!accountId) {
      const guestToken = body.guest_token;
      if (!guestToken || typeof guestToken !== "string") {
        return jsonResponse(res, 400, { error: "Guest token required for anonymous feedback" });
      }
      guestTokenHash = hashGuestToken(guestToken);

      // Check rate limit: max 3 submissions per 24h for guest
      const twentyFourHoursAgo = new Date(Date.now() - GUEST_RATE_LIMIT_WINDOW_MS).toISOString();
      const { count } = await supabaseAdmin
        .from("feedback_entries")
        .select("*", { count: "exact", head: true })
        .eq("guest_token_hash", guestTokenHash)
        .eq("source_surface", "global_form")
        .gte("created_at", twentyFourHoursAgo);

      if ((count ?? 0) >= GUEST_MAX_SUBMISSIONS) {
        return jsonResponse(res, 429, { error: "Too many submissions. Please try again later." });
      }
    }

    // Duplicate check for post_session feedback
    if (sourceSurface === "post_session" && body.module_id) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const dedupKey = accountId || guestTokenHash;
      const { count } = await supabaseAdmin
        .from("feedback_entries")
        .select("*", { count: "exact", head: true })
        .eq(sourceSurface === "post_session" && accountId ? "account_id" : "guest_token_hash", dedupKey!)
        .eq("module_id", body.module_id)
        .eq("source_surface", "post_session")
        .gte("created_at", `${today}T00:00:00`);

      if ((count ?? 0) > 0) {
        return jsonResponse(res, 200, { success: true, alreadySubmitted: true });
      }
    }

    // Insert feedback
    const { error: insertError } = await supabaseAdmin.from("feedback_entries").insert({
      submitter_kind: submitterKind,
      account_id: accountId || null,
      training_profile_id: body.training_profile_id || null,
      guest_token_hash: guestTokenHash,
      source_surface: sourceSurface,
      category: category,
      module_id: body.module_id || null,
      mode_id: body.mode_id || null,
      route: body.route || null,
      sentiment: body.sentiment || null,
      star_rating: starRating,
      reasons: reasons.length > 0 ? reasons : null,
      comment: comment,
      contact_email: contactEmail,
      client_context: body.client_context || null,
      review_status: "new"
    });

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      // Check for unique violation (duplicate)
      if (insertError.code === "23505") {
        return jsonResponse(res, 200, { success: true, alreadySubmitted: true });
      }
      return jsonResponse(res, 500, { error: "Failed to save feedback" });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (error) {
    console.error("Feedback API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error" });
  }
}
