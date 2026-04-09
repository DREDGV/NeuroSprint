const GUEST_TOKEN_KEY = "ns.guest_feedback_token";

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getOrCreateGuestToken(): string {
  try {
    const existing = localStorage.getItem(GUEST_TOKEN_KEY);
    if (existing && existing.length === 64) {
      return existing;
    }

    const newToken = generateToken();
    localStorage.setItem(GUEST_TOKEN_KEY, newToken);
    return newToken;
  } catch {
    // Fallback for private mode
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function clearGuestToken(): void {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    // Ignore
  }
}
