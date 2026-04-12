import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSupabaseAdmin,
  verifyAuthToken,
  type AccountRow,
  type IdeaPostInsert,
  type IdeaPostRow,
  type IdeaVoteRow
} from "../_lib/supabase.js";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;
const MIN_TITLE_LENGTH = 4;
const MIN_BODY_LENGTH = 10;
const VALID_CATEGORIES = [
  "training",
  "ux",
  "progress",
  "social",
  "account",
  "stats",
  "other"
] as const;

type IdeaCategory = (typeof VALID_CATEGORIES)[number];

function trimString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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

function parseIdeaCategory(value: unknown): IdeaCategory {
  const normalized = trimString(value, 32);
  return VALID_CATEGORIES.includes(normalized as IdeaCategory)
    ? (normalized as IdeaCategory)
    : "other";
}

function jsonResponse(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return handleGetIdeas(req, res);
  }

  if (req.method === "POST") {
    return handleCreateIdea(req, res);
  }

  return jsonResponse(res, 405, { error: "Method not allowed." });
}

async function handleGetIdeas(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("idea_posts")
      .select(
        "id, title, body, category, moderation_status, roadmap_status, vote_count, created_at, author_account_id",
        { count: "exact" }
      )
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!accountId) {
      query = query.eq("moderation_status", "approved");
    } else {
      query = query.or(`moderation_status.eq.approved,author_account_id.eq.${accountId}`);
    }

    const { data: ideasData, error, count } = await query;
    if (error) {
      console.error("Ideas fetch error:", error);
      return jsonResponse(res, 500, { error: "Failed to load ideas." });
    }

    const ideas = (ideasData ?? []) as IdeaPostRow[];
    const authorIds = [...new Set(ideas.map((idea) => idea.author_account_id).filter(Boolean))];
    const authorNames: Record<string, string> = {};

    if (authorIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from("accounts")
        .select("id, display_name")
        .in("id", authorIds);

      const users = (usersData ?? []) as AccountRow[];
      for (const user of users) {
        authorNames[user.id] = user.display_name || "NeuroSprint user";
      }
    }

    let userVotes = new Set<string>();
    if (accountId && ideas.length > 0) {
      const { data: votesData } = await supabaseAdmin
        .from("idea_votes")
        .select("idea_id")
        .eq("account_id", accountId)
        .in(
          "idea_id",
          ideas.map((idea) => idea.id)
        );

      const votes = (votesData ?? []) as Pick<IdeaVoteRow, "idea_id">[];
      userVotes = new Set(votes.map((vote) => vote.idea_id));
    }

    return jsonResponse(res, 200, {
      ideas: ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        body: idea.body,
        category: idea.category,
        moderation_status: idea.moderation_status,
        roadmap_status: idea.roadmap_status,
        vote_count: idea.vote_count,
        created_at: idea.created_at,
        author_name: authorNames[idea.author_account_id] || "NeuroSprint user",
        is_author: idea.author_account_id === accountId,
        has_voted: userVotes.has(idea.id)
      })),
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit
    });
  } catch (error) {
    console.error("Ideas API error:", error);
    return jsonResponse(res, 500, { error: "Internal server error." });
  }
}

async function handleCreateIdea(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const accountId = await verifyAuthToken(req.headers.authorization);
    if (!accountId) {
      return jsonResponse(res, 401, { error: "Sign in to submit an idea." });
    }

    const body = parseRequestBody(req.body);
    const title = trimString(body.title, MAX_TITLE_LENGTH);
    const ideaBody = trimString(body.body, MAX_BODY_LENGTH);
    const category = parseIdeaCategory(body.category);

    if (title.length < MIN_TITLE_LENGTH) {
      return jsonResponse(res, 400, {
        error: `Title must be at least ${MIN_TITLE_LENGTH} characters long.`
      });
    }

    if (ideaBody.length < MIN_BODY_LENGTH) {
      return jsonResponse(res, 400, {
        error: `Description must be at least ${MIN_BODY_LENGTH} characters long.`
      });
    }

    const { count: existingCount } = await supabaseAdmin
      .from("idea_posts")
      .select("*", { count: "exact", head: true })
      .eq("author_account_id", accountId)
      .filter("title", "ilike", title)
      .in("moderation_status", ["pending", "approved"]);

    if ((existingCount ?? 0) > 0) {
      return jsonResponse(res, 409, { error: "An idea with this title already exists." });
    }

    const insertPayload: IdeaPostInsert = {
      author_account_id: accountId,
      author_profile_id: null,
      title,
      body: ideaBody,
      category,
      moderation_status: "pending",
      roadmap_status: "new",
      vote_count: 0
    };

    const { data: newIdeaData, error: insertError } = await supabaseAdmin
      .from("idea_posts")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Idea insert error:", insertError);
      if (insertError.code === "23505") {
        return jsonResponse(res, 409, { error: "An idea with this title already exists." });
      }
      return jsonResponse(res, 500, { error: "Failed to create idea." });
    }

    const newIdea = (newIdeaData ?? null) as IdeaPostRow | null;
    if (!newIdea) {
      return jsonResponse(res, 500, { error: "Failed to load created idea." });
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
    return jsonResponse(res, 500, { error: "Internal server error." });
  }
}
