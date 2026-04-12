import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import {
  getSupabaseAdmin,
  verifyAuthToken,
  type FeedbackEntryInsert,
  type Json
} from "./_lib/supabase.js";

const GUEST_HASH_SECRET = process.env.FEEDBACK_GUEST_HASH_SECRET || "dev-secret-change-in-production";
const MAX_COMMENT_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_REASONS = 5;
const MAX_REASON_LENGTH = 100;
const GUEST_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const GUEST_MAX_SUBMISSIONS = 3;
const VALID_CATEGORIES = ["bug", "ux", "idea", "question", "praise"] as const;
const VALID_SURFACES = ["post_session", "global_form"] as const;

type FeedbackCategory = (typeof VALID_CATEGORIES)[number];
type FeedbackSurface = (typeof VALID_SURFACES)[number];

function hashGuestToken(token: string): string {
  return crypto.createHmac("sha256", GUEST_HASH_SECRET).update(token).digest("hex");
}

function trimString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalString(value: unknown, maxLength: number): string | null {
  const normalized = trimString(value, maxLength);
  return normalized || null;
}

function parseRequestBody(body: unknown): Record<string, unknown> {
  if (typeof body === "string") {
    return JSON.parse(body) as Record<string, unknown>;
  }

  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }

  return {};
}

function parseFeedbackCategory(value: unknown): FeedbackCategory | null {
  const normalized = trimString(value, 32);
  return VALID_CATEGORIES.includes(normalized as FeedbackCategory)
    ? (normalized as FeedbackCategory)
    : null;
}

function parseFeedbackSurface(value: unknown): FeedbackSurface | null {
  const normalized = trimString(value, 32);
  return VALID_SURFACES.includes(normalized as FeedbackSurface)
    ? (normalized as FeedbackSurface)
    : null;
}

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed." });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = parseRequestBody(req.body);

    if (body._website || body._honeypot) {
      return jsonResponse(res, 200, { success: true });
    }

    const category = parseFeedbackCategory(body.category);
    if (!category) {
      return jsonResponse(res, 400, { error: "Invalid category." });
    }

    const sourceSurface = parseFeedbackSurface(body.source_surface);
    if (!sourceSurface) {
      return jsonResponse(res, 400, { error: "Invalid source surface." });
    }

    const comment = trimString(body.comment, MAX_COMMENT_LENGTH);
    if (!comment) {
      return jsonResponse(res, 400, { error: "Comment is required." });
    }

    let starRating: number | null = null;
    if (body.star_rating != null) {
      const rating = Number(body.star_rating);
      if (Number.isInteger(rating) && rating >= 1 && rating <= 10) {
        starRating = rating;
      }
    }

    let reasons: string[] = [];
    if (Array.isArray(body.reasons)) {
      reasons = body.reasons
        .filter((item): item is string => typeof item === "string")
        .map((item) => trimString(item, MAX_REASON_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_REASONS);
    }

    const contactEmail = optionalString(body.contact_email, MAX_EMAIL_LENGTH);
    const authHeader = req.headers.authorization;
    const accountId = await verifyAuthToken(authHeader);
    const submitterKind = accountId ? "account" : "guest";

    let guestTokenHash: string | null = null;
    if (!accountId) {
      const guestToken = typeof body.guest_token === "string" ? body.guest_token : "";
      if (!guestToken) {
        return jsonResponse(res, 400, { error: "Guest token is required." });
      }

      guestTokenHash = hashGuestToken(guestToken);
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

    if (sourceSurface === "post_session" && moduleId) {
      const today = new Date().toISOString().slice(0, 10);
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

    const clientContext =
      body.client_context !== undefined && body.client_context !== null
        ? (body.client_context as Json)
        : null;

    const insertPayload: FeedbackEntryInsert = {
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
      client_context: clientContext,
      review_status: "new"
    };

    const { error: insertError } = await supabaseAdmin.from("feedback_entries").insert(insertPayload);
    if (insertError) {
      console.error("Feedback insert error:", insertError);
      if (insertError.code === "23505") {
        return jsonResponse(res, 200, { success: true, alreadySubmitted: true });
      }
      return jsonResponse(res, 500, { error: "Failed to save feedback." });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (error) {
    console.error("Feedback API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error." });
  }
}
