import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyModeratorToken } from "../../_lib/supabase.js";

const MODERATION_STATUSES = new Set(["pending", "approved", "rejected"]);
const ROADMAP_STATUSES = new Set(["new", "planned", "in_progress", "done", "declined"]);

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

function parseBody(body: unknown) {
  if (typeof body === "string") {
    return JSON.parse(body) as Record<string, unknown>;
  }
  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return jsonResponse(res, 405, { error: "Метод не поддерживается." });
  }

  const auth = await verifyModeratorToken(req.headers.authorization);
  if (!auth) {
    return jsonResponse(res, 403, {
      error: "Модерация доступна только модераторам и администраторам."
    });
  }

  const ideaId = req.query.id as string;
  if (!ideaId) {
    return jsonResponse(res, 400, { error: "Не указан идентификатор идеи." });
  }

  try {
    const body = parseBody(req.body);
    const moderationStatus = String(body.moderation_status ?? "");
    const roadmapStatus = String(body.roadmap_status ?? "");
    const rejectionNote =
      typeof body.rejection_note === "string" ? body.rejection_note.trim().slice(0, 500) : null;

    if (!MODERATION_STATUSES.has(moderationStatus)) {
      return jsonResponse(res, 400, { error: "Недопустимый статус модерации." });
    }

    if (roadmapStatus && !ROADMAP_STATUSES.has(roadmapStatus)) {
      return jsonResponse(res, 400, { error: "Недопустимый roadmap-статус." });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const patch: Record<string, unknown> = {
      moderation_status: moderationStatus,
      updated_at: new Date().toISOString()
    };

    if (moderationStatus === "rejected") {
      patch.roadmap_status = "declined";
      patch.rejection_note = rejectionNote || null;
    } else {
      patch.roadmap_status = roadmapStatus || "new";
      patch.rejection_note = null;
    }

    const { data: updatedIdea, error } = await supabaseAdmin
      .from("idea_posts")
      .update(patch)
      .eq("id", ideaId)
      .select(
        `
          id,
          title,
          body,
          category,
          moderation_status,
          roadmap_status,
          rejection_note,
          vote_count,
          created_at,
          author_account_id
        `
      )
      .single();

    if (error || !updatedIdea) {
      console.error("Admin idea update error:", error);
      return jsonResponse(res, 500, { error: "Не удалось обновить статус идеи." });
    }

    const { data: authorAccount } = await supabaseAdmin
      .from("accounts")
      .select("id, display_name")
      .eq("id", updatedIdea.author_account_id)
      .maybeSingle();

    return jsonResponse(res, 200, {
      ...updatedIdea,
      author_name: authorAccount?.display_name || "Пользователь NeuroSprint",
      is_author: updatedIdea.author_account_id === auth.accountId,
      has_voted: false
    });
  } catch (error) {
    console.error("Admin idea update crashed:", error);
    return jsonResponse(res, 500, { error: "Внутренняя ошибка сервера." });
  }
}
