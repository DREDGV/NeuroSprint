import type { IdeaCreatePayload, IdeaSummary, IdeasListResponse, IdeaVoteState } from "./types";

const API_BASE = ""; // Relative URL for Vercel Functions

export async function fetchIdeas(
  authToken?: string,
  page = 1,
  limit = 20
): Promise<IdeasListResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const url = `${API_BASE}/api/ideas?page=${page}&limit=${limit}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error("Failed to fetch ideas");
  }

  return response.json();
}

export async function createIdea(
  payload: IdeaCreatePayload,
  authToken: string
): Promise<IdeaSummary> {
  const response = await fetch(`${API_BASE}/api/ideas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to create idea");
  }

  return response.json();
}

export async function voteForIdea(
  ideaId: string,
  authToken: string
): Promise<{ success: boolean; alreadyVoted?: boolean }> {
  const response = await fetch(`${API_BASE}/api/ideas/${ideaId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to vote");
  }

  return response.json();
}

export async function unvoteIdea(
  ideaId: string,
  authToken: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/api/ideas/${ideaId}/vote`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to remove vote");
  }

  return response.json();
}
