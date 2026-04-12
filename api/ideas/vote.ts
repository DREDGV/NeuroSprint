import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSupabaseAdmin,
  verifyAuthToken,
  type IdeaPostRow,
  type IdeaVoteInsert,
  type IdeaVoteRow
} from "../_lib/supabase.js";

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === "string") {
    return JSON.parse(body) as Record<string, unknown>;
  }
  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const ideaId = typeof body.idea_id === "string" ? body.idea_id.trim() : "";

  if (!ideaId) {
    return jsonResponse(res, 400, { error: "Idea id is required." });
  }

  if (req.method === "POST") {
    return handleVote(req, res, ideaId);
  }

  if (req.method === "DELETE") {
    return handleUnvote(req, res, ideaId);
  }

  return jsonResponse(res, 405, { error: "Method not allowed." });
}

async function syncIdeaVoteCount(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, ideaId: string) {
  const ideaVotesTable = supabaseAdmin.from("idea_votes") as any;
  const ideaPostsTable = supabaseAdmin.from("idea_posts") as any;

  const { count, error: countError } = await ideaVotesTable
    .select("id", { count: "exact", head: true })
    .eq("idea_id", ideaId);

  if (countError) {
    throw countError;
  }

  const voteCount = count ?? 0;
  const { error: updateError } = await ideaPostsTable
    .update({ vote_count: voteCount })
    .eq("id", ideaId);

  if (updateError) {
    throw updateError;
  }

  return voteCount;
}

async function handleVote(req: VercelRequest, res: VercelResponse, ideaId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const ideaVotesTable = supabaseAdmin.from("idea_votes") as any;
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Sign in to vote." });
    }

    const { data: ideaData, error: ideaError } = await supabaseAdmin
      .from("idea_posts")
      .select("id, moderation_status, author_account_id")
      .eq("id", ideaId)
      .single();

    const idea =
      (ideaData as Pick<IdeaPostRow, "id" | "moderation_status" | "author_account_id"> | null) ??
      null;

    if (ideaError || !idea) {
      return jsonResponse(res, 404, { error: "Idea not found." });
    }

    if (idea.moderation_status !== "approved") {
      return jsonResponse(res, 403, { error: "Voting is only available for approved ideas." });
    }

    if (idea.author_account_id === accountId) {
      return jsonResponse(res, 403, { error: "You cannot vote for your own idea." });
    }

    const { data: existingVoteData } = await supabaseAdmin
      .from("idea_votes")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("account_id", accountId)
      .maybeSingle();

    const existingVote = (existingVoteData as Pick<IdeaVoteRow, "id"> | null) ?? null;
    if (existingVote) {
      const voteCount = await syncIdeaVoteCount(supabaseAdmin, ideaId);
      return jsonResponse(res, 200, {
        success: true,
        alreadyVoted: true,
        has_voted: true,
        vote_count: voteCount
      });
    }

    const insertPayload: IdeaVoteInsert = {
      idea_id: ideaId,
      account_id: accountId
    };

    const { error: insertError } = await ideaVotesTable.insert(insertPayload);
    if (insertError) {
      if (insertError.code === "23505") {
        const voteCount = await syncIdeaVoteCount(supabaseAdmin, ideaId);
        return jsonResponse(res, 200, {
          success: true,
          alreadyVoted: true,
          has_voted: true,
          vote_count: voteCount
        });
      }
      console.error("Vote insert error:", insertError);
      return jsonResponse(res, 500, { error: "Failed to vote for idea." });
    }

    const voteCount = await syncIdeaVoteCount(supabaseAdmin, ideaId);
    return jsonResponse(res, 200, { success: true, has_voted: true, vote_count: voteCount });
  } catch (error) {
    console.error("Vote API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error." });
  }
}

async function handleUnvote(req: VercelRequest, res: VercelResponse, ideaId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Sign in to remove your vote." });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("idea_votes")
      .delete()
      .eq("idea_id", ideaId)
      .eq("account_id", accountId);

    if (deleteError) {
      console.error("Vote delete error:", deleteError);
      return jsonResponse(res, 500, { error: "Failed to remove vote." });
    }

    const voteCount = await syncIdeaVoteCount(supabaseAdmin, ideaId);
    return jsonResponse(res, 200, { success: true, has_voted: false, vote_count: voteCount });
  } catch (error) {
    console.error("Unvote API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error." });
  }
}
