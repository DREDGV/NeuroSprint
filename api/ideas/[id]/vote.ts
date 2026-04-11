import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyAuthToken } from "../../_lib/supabase.js";

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ideaId = req.query.id as string;
  if (!ideaId) {
    return jsonResponse(res, 400, { error: "Не указан идентификатор идеи." });
  }

  if (req.method === "POST") {
    return handleVote(req, res, ideaId);
  }

  if (req.method === "DELETE") {
    return handleUnvote(req, res, ideaId);
  }

  return jsonResponse(res, 405, { error: "Метод не поддерживается." });
}

async function handleVote(req: VercelRequest, res: VercelResponse, ideaId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Войдите в аккаунт, чтобы поддержать идею." });
    }

    const { data: idea, error: ideaError } = await supabaseAdmin
      .from("idea_posts")
      .select("id, moderation_status, author_account_id")
      .eq("id", ideaId)
      .single();

    if (ideaError || !idea) {
      return jsonResponse(res, 404, { error: "Идея не найдена." });
    }
    if (idea.moderation_status !== "approved") {
      return jsonResponse(res, 403, { error: "Поддержка доступна только для одобренных идей." });
    }
    if (idea.author_account_id === accountId) {
      return jsonResponse(res, 403, { error: "Свою идею поддерживать не нужно." });
    }

    const { data: existingVote } = await supabaseAdmin
      .from("idea_votes")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (existingVote) {
      return jsonResponse(res, 200, { success: true, alreadyVoted: true });
    }

    const { error: insertError } = await supabaseAdmin.from("idea_votes").insert({
      idea_id: ideaId,
      account_id: accountId
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse(res, 200, { success: true, alreadyVoted: true });
      }
      console.error("Vote insert error:", insertError);
      return jsonResponse(res, 500, { error: "Не удалось поддержать идею." });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (error) {
    console.error("Vote API error:", error);
    return jsonResponse(res, 500, { error: "Внутренняя ошибка сервера." });
  }
}

async function handleUnvote(req: VercelRequest, res: VercelResponse, ideaId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Войдите в аккаунт, чтобы снять поддержку." });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("idea_votes")
      .delete()
      .eq("idea_id", ideaId)
      .eq("account_id", accountId);

    if (deleteError) {
      console.error("Unvote error:", deleteError);
      return jsonResponse(res, 500, { error: "Не удалось снять поддержку с идеи." });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (error) {
    console.error("Unvote API error:", error);
    return jsonResponse(res, 500, { error: "Внутренняя ошибка сервера." });
  }
}
