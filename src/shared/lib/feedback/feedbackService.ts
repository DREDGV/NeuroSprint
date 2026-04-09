import type { FeedbackSubmitPayload, FeedbackSubmitResult } from "./types";

const API_BASE = ""; // Relative URL for Vercel Functions

export async function submitFeedback(
  payload: FeedbackSubmitPayload,
  authToken?: string
): Promise<FeedbackSubmitResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to submit feedback");
  }

  return response.json();
}
