import type { FeedbackSubmitPayload, FeedbackSubmitResult } from "./types";

const API_BASE = ""; // Relative URL for Vercel Functions
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1"]);

function assertFeedbackApiWriteAvailable() {
  if (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    LOCALHOST_NAMES.has(window.location.hostname)
  ) {
    throw new Error(
      "На localhost отправка отзывов недоступна. Проверьте форму на сайте или в Vercel Preview."
    );
  }
}

export async function submitFeedback(
  payload: FeedbackSubmitPayload,
  authToken?: string
): Promise<FeedbackSubmitResult> {
  assertFeedbackApiWriteAvailable();

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
