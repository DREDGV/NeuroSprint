const LEVEL_UP_CELEBRATION_PREFIX = "ns.levelUpCelebrated";

export function getLevelUpCelebrationKey(userId: string, localDate: string): string {
  return `${LEVEL_UP_CELEBRATION_PREFIX}:${userId}:${localDate}`;
}

export function hasLevelUpCelebrated(userId: string, localDate: string): boolean {
  return localStorage.getItem(getLevelUpCelebrationKey(userId, localDate)) === "1";
}

export function markLevelUpCelebrated(userId: string, localDate: string): void {
  localStorage.setItem(getLevelUpCelebrationKey(userId, localDate), "1");
}
