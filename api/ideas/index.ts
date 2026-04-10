import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyAuthToken } from "../_lib/supabase";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

function trimAndValidateString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
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

// GET /api/ideas — public list of approved ideas
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return handleGetIdeas(req, res);
  }

  if (req.method === "POST") {
    return handleCreateIdea(req, res);
  }

  return jsonResponse(res, 405, { error: "Method not allowed" });
}

async function handleGetIdeas(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Public users see only approved ideas. Signed-in users see approved ideas plus their own drafts.
    let query = supabaseAdmin
      .from("idea_posts")
      .select(`
        id,
        title,
        body,
        category,
        moderation_status,
        roadmap_status,
        vote_count,
        created_at,
        author_account_id
      `, { count: "exact" })
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!accountId) {
      query = query.eq("moderation_status", "approved");
    } else {
      query = query.or(`moderation_status.eq.approved,author_account_id.eq.${accountId}`);
    }

    const { data: ideas, error, count } = await query;

    if (error) {
      console.error("Ideas fetch error:", error);
      return jsonResponse(res, 500, { error: "Failed to fetch ideas" });
    }

    // Fetch author display names
    const authorIds = [...new Set(ideas?.map((i) => i.author_account_id).filter(Boolean) as string[])];
    let authorNames: Record<string, string> = {};

    if (authorIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("accounts")
        .select("id, display_name")
        .in("id", authorIds);

      if (users) {
        for (const user of users) {
          authorNames[user.id] = user.display_name || "Пользователь NeuroSprint";
        }
      }
    }

    // Check vote state for authenticated user
    let userVotes: Set<string> = new Set();
    if (accountId && (ideas?.length ?? 0) > 0) {
      const { data: votes } = await supabaseAdmin
        .from("idea_votes")
        .select("idea_id")
        .eq("account_id", accountId)
        .in("idea_id", ideas!.map((i) => i.id));

      if (votes) {
        userVotes = new Set(votes.map((v) => v.idea_id));
      }
    }

    const formattedIdeas = (ideas || []).map((idea) => ({
      id: idea.id,
      title: idea.title,
      body: idea.body,
      category: idea.category,
      moderation_status: idea.moderation_status,
      roadmap_status: idea.roadmap_status,
      vote_count: idea.vote_count,
      created_at: idea.created_at,
      author_name: authorNames[idea.author_account_id] || "Пользователь NeuroSprint",
      is_author: idea.author_account_id === accountId,
      has_voted: userVotes.has(idea.id)
    }));

    return jsonResponse(res, 200, {
      ideas: formattedIdeas,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit
    });
  } catch (error) {
    console.error("Ideas API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error" });
  }
}

async function handleCreateIdea(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Authentication required to create ideas" });
    }

    const body = parseRequestBody(req.body);

    const title = trimAndValidateString(body.title, MAX_TITLE_LENGTH);
    if (!title) {
      return jsonResponse(res, 400, { error: "Title is required" });
    }

    const ideaBody = trimAndValidateString(body.body, MAX_BODY_LENGTH);
    if (!ideaBody) {
      return jsonResponse(res, 400, { error: "Description is required" });
    }

    const validCategories = ["training", "ux", "progress", "social", "account", "stats", "other"];
    const category = validCategories.includes(body.category) ? body.category : "other";

    // Duplicate check: same normalized title from same author in pending/approved status
    const { count: existingCount } = await supabaseAdmin
      .from("idea_posts")
      .select("*", { count: "exact", head: true })
      .eq("author_account_id", accountId)
      .filter("title", "ilike", title)
      .in("moderation_status", ["pending", "approved"]);

    if ((existingCount ?? 0) > 0) {
      return jsonResponse(res, 409, { error: "Идея с таким названием уже существует" });
    }

    const { data: newIdea, error: insertError } = await supabaseAdmin
      .from("idea_posts")
      .insert({
        author_account_id: accountId,
        author_profile_id: body.author_profile_id || null,
        title: title,
        body: ideaBody,
        category: category,
        moderation_status: "pending",
        roadmap_status: "new",
        vote_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error("Idea insert error:", insertError);
      if (insertError.code === "23505") {
        return jsonResponse(res, 409, { error: "Идея с таким названием уже существует" });
      }
      return jsonResponse(res, 500, { error: "Failed to create idea" });
    }

    return jsonResponse(res, 201, {
      id: newIdea.id,
      title: newIdea.title,
      body: newIdea.body,
      category: newIdea.category,
      moderation_status: newIdea.moderation_status,
      roadmap_status: newIdea.roadmap_status,
      vote_count: 0,
      created_at: newIdea.created_at
    });
  } catch (error) {
    console.error("Create idea API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error" });
  }
}
