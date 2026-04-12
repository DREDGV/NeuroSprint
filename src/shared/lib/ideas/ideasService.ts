import type { IdeaCreatePayload, IdeaSummary, IdeasListResponse, IdeaVoteState } from "./types";

const API_BASE = "";
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1"]);
const LOCALHOST_WRITE_MESSAGE =
  "На localhost отправка идей и голосование не поддерживаются. Проверяйте эти действия на сайте или в Vercel Preview.";

function isLocalhostRuntime() {
  return typeof window !== "undefined" && LOCALHOST_NAMES.has(window.location.hostname);
}

function assertIdeasApiWriteAvailable() {
  if (isLocalhostRuntime()) {
    throw new Error(LOCALHOST_WRITE_MESSAGE);
  }
}

async function readErrorMessage(response: Response, fallback: string) {
  const errorBody = await response.json().catch(() => ({}));
  if (typeof errorBody.error === "string" && errorBody.error.trim()) {
    return errorBody.error.trim();
  }
  return fallback;
}

export async function fetchIdeas(
  authToken?: string,
  page = 1,
  limit = 20
): Promise<IdeasListResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}/api/ideas?page=${page}&limit=${limit}`, { headers });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Не удалось загрузить идеи."));
  }

  return response.json();
}

export async function createIdea(payload: IdeaCreatePayload, authToken: string): Promise<IdeaSummary> {
  assertIdeasApiWriteAvailable();

  const response = await fetch(`${API_BASE}/api/ideas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Не удалось отправить идею."));
  }

  return response.json();
}

export async function voteForIdea(
  ideaId: string,
  authToken: string
): Promise<IdeaVoteState> {
  assertIdeasApiWriteAvailable();

  const response = await fetch(`${API_BASE}/api/ideas/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ idea_id: ideaId })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Не удалось поддержать идею."));
  }

  return response.json();
}

export async function unvoteIdea(
  ideaId: string,
  authToken: string
): Promise<IdeaVoteState> {
  assertIdeasApiWriteAvailable();

  const response = await fetch(`${API_BASE}/api/ideas/vote`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ idea_id: ideaId })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Не удалось снять поддержку с идеи."));
  }

  return response.json();
}
