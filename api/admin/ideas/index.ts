import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyModeratorToken } from "../../_lib/supabase.js";

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Метод не поддерживается." });
  }

  const auth = await verifyModeratorToken(req.headers.authorization);
  if (!auth) {
    return jsonResponse(res, 403, {
      error: "Модерация доступна только модераторам и администраторам."
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requestedStatus = typeof req.query.status === "string" ? req.query.status : "all";

    let query = supabaseAdmin
      .from("idea_posts")
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
      .order("created_at", { ascending: false });

    if (
      requestedStatus === "pending" ||
      requestedStatus === "approved" ||
      requestedStatus === "rejected"
    ) {
      query = query.eq("moderation_status", requestedStatus);
    }

    const { data: ideas, error } = await query;

    if (error) {
      console.error("Admin ideas fetch error:", error);
      return jsonResponse(res, 500, { error: "Не удалось загрузить очередь идей." });
    }

    const authorIds = [
      ...new Set((ideas ?? []).map((idea) => idea.author_account_id).filter(Boolean) as string[])
    ];
    const authorNames: Record<string, string> = {};

    if (authorIds.length > 0) {
      const { data: accounts } = await supabaseAdmin
        .from("accounts")
        .select("id, display_name")
        .in("id", authorIds);

      for (const account of accounts ?? []) {
        authorNames[account.id] = account.display_name || "Пользователь NeuroSprint";
      }
    }

    return jsonResponse(res, 200, {
      ideas: (ideas ?? []).map((idea) => ({
        ...idea,
        author_name: authorNames[idea.author_account_id] || "Пользователь NeuroSprint",
        is_author: idea.author_account_id === auth.accountId,
        has_voted: false
      }))
    });
  } catch (error) {
    console.error("Admin ideas API crashed:", error);
    return jsonResponse(res, 500, { error: "Внутренняя ошибка сервера." });
  }
}
