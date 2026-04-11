import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyAuthToken } from "../../_lib/supabase.js";

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

// POST /api/ideas/:id/vote — add vote
// DELETE /api/ideas/:id/vote — remove vote
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ideaId = req.query.id as string;
  if (!ideaId) {
    return jsonResponse(res, 400, { error: "Idea ID is required" });
  }

  if (req.method === "POST") {
    return handleVote(req, res, ideaId);
  }

  if (req.method === "DELETE") {
    return handleUnvote(req, res, ideaId);
  }

  return jsonResponse(res, 405, { error: "Method not allowed" });
}

async function handleVote(req: VercelRequest, res: VercelResponse, ideaId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Authentication required to vote" });
    }

    // Only approved ideas are votable on the public board.
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from("idea_posts")
      .select("id, moderation_status")
      .eq("id", ideaId)
      .single();

    if (ideaError || !idea) {
      return jsonResponse(res, 404, { error: "Idea not found" });
    }
    if (idea.moderation_status !== "approved") {
      return jsonResponse(res, 403, { error: "Voting is available only for approved ideas" });
    }

    // Check if already voted (idempotent)
    const { data: existingVote } = await supabaseAdmin
      .from("idea_votes")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("account_id", accountId)
      .single();

    if (existingVote) {
      return jsonResponse(res, 200, { success: true, alreadyVoted: true });
    }

    // Insert vote (trigger will update vote_count)
    const { error: insertError } = await supabaseAdmin.from("idea_votes").insert({
      idea_id: ideaId,
      account_id: accountId
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse(res, 200, { success: true, alreadyVoted: true });
      }
      console.error("Vote insert error:", insertError);
      return jsonResponse(res, 500, { error: "Failed to vote" });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (error) {
    console.error("Vote API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error" });
  }
}

async function handleUnvote(req: VercelRequest, res: VercelResponse, ideaId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Authentication required" });
    }

    // Delete vote (trigger will update vote_count)
    const { error: deleteError } = await supabaseAdmin
      .from("idea_votes")
      .delete()
      .eq("idea_id", ideaId)
      .eq("account_id", accountId);

    if (deleteError) {
      console.error("Unvote error:", deleteError);
      return jsonResponse(res, 500, { error: "Failed to remove vote" });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (error) {
    console.error("Unvote API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error" });
  }
}
