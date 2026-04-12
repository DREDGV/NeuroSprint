import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getSupabaseAdmin, verifyAuthToken } from "./_lib/supabase.js";

const GUEST_HASH_SECRET = process.env.FEEDBACK_GUEST_HASH_SECRET || "dev-secret-change-in-production";
const MAX_COMMENT_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_REASONS = 5;
const MAX_REASON_LENGTH = 100;
const GUEST_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const GUEST_MAX_SUBMISSIONS = 3;
const VALID_CATEGORIES = ["bug", "ux", "idea", "question", "praise"] as const;
const VALID_SURFACES = ["post_session", "global_form"] as const;

type FeedbackCategory = (typeof VALID_CATEGORIES)[number];
type FeedbackSurface = (typeof VALID_SURFACES)[number];

function hashGuestToken(token: string): string {
  return crypto.createHmac("sha256", GUEST_HASH_SECRET).update(token).digest("hex");
}

function trimAndValidateString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
}

function optionalString(value: unknown, maxLength: number): string | null {
  const normalized = trimAndValidateString(value, maxLength);
  return normalized || null;
}

function parseFeedbackCategory(value: unknown): FeedbackCategory | null {
  const normalized = trimAndValidateString(value, 32);
  return VALID_CATEGORIES.includes(normalized as FeedbackCategory)
    ? (normalized as FeedbackCategory)
    : null;
}

function parseFeedbackSurface(value: unknown): FeedbackSurface | null {
  const normalized = trimAndValidateString(value, 32);
  return VALID_SURFACES.includes(normalized as FeedbackSurface)
    ? (normalized as FeedbackSurface)
    : null;
}

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

function parseRequestBody(body: unknown) {
  if (typeof body === "string") {
    return JSON.parse(body) as Record<string, unknown>;
  }

  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }

  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = parseRequestBody(req.body);

    // Honeypot check
    if (body._website || body._honeypot) {
      return jsonResponse(res, 200, { success: true }); // Silent accept for bots
    }

    // Validate required fields
    const category = parseFeedbackCategory(body.category);
    if (!category) {
      return jsonResponse(res, 400, { error: "Invalid category" });
    }

    const sourceSurface = parseFeedbackSurface(body.source_surface);
    if (!sourceSurface) {
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
    const contactEmail = optionalString(body.contact_email, MAX_EMAIL_LENGTH);

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

    const trainingProfileId = optionalString(body.training_profile_id, 120);
    const moduleId = optionalString(body.module_id, 120);
    const modeId = optionalString(body.mode_id, 120);
    const route = optionalString(body.route, MAX_COMMENT_LENGTH);
    const sentiment = optionalString(body.sentiment, 100);

    // Duplicate check for post_session feedback
    if (sourceSurface === "post_session" && moduleId) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const dedupKey = accountId || guestTokenHash;
      if (dedupKey) {
        const dedupColumn = accountId ? "account_id" : "guest_token_hash";
        const { count } = await supabaseAdmin
          .from("feedback_entries")
          .select("*", { count: "exact", head: true })
          .eq(dedupColumn, dedupKey)
          .eq("module_id", moduleId)
          .eq("source_surface", "post_session")
          .gte("created_at", `${today}T00:00:00`);

        if ((count ?? 0) > 0) {
          return jsonResponse(res, 200, { success: true, alreadySubmitted: true });
        }
      }
    }

    // Insert feedback
    const { error: insertError } = await supabaseAdmin.from("feedback_entries").insert({
      submitter_kind: submitterKind,
      account_id: accountId || null,
      training_profile_id: trainingProfileId,
      guest_token_hash: guestTokenHash,
      source_surface: sourceSurface,
      category,
      module_id: moduleId,
      mode_id: modeId,
      route,
      sentiment,
      star_rating: starRating,
      reasons: reasons.length > 0 ? reasons : null,
      comment,
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
