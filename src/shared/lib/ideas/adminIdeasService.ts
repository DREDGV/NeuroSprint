import type {
  AdminIdeasListResponse,
  IdeaModerationStatus,
  IdeaRoadmapStatus,
  ModerationIdeaSummary
} from "./types";

const API_BASE = "";

async function readErrorMessage(response: Response, fallback: string) {
  const errorBody = await response.json().catch(() => ({}));
  if (typeof errorBody.error === "string" && errorBody.error.trim()) {
    return errorBody.error.trim();
  }
  return fallback;
}

export async function fetchAdminIdeas(
  authToken: string,
  status: IdeaModerationStatus | "all" = "all"
): Promise<AdminIdeasListResponse> {
  const search = status === "all" ? "" : `?status=${status}`;
  const response = await fetch(`${API_BASE}/api/admin/ideas${search}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Не удалось загрузить очередь модерации."));
  }

  return response.json();
}

export async function updateIdeaModeration(
  ideaId: string,
  payload: {
    moderation_status: IdeaModerationStatus;
    roadmap_status?: IdeaRoadmapStatus;
    rejection_note?: string | null;
  },
  authToken: string
): Promise<ModerationIdeaSummary> {
  const response = await fetch(`${API_BASE}/api/admin/ideas`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      idea_id: ideaId,
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Не удалось обновить статус идеи."));
  }

  return response.json();
}
