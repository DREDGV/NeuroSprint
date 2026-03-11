import type { SessionSaveResult } from "../../../entities/session/sessionRepository";
import { formatProgressGoalLine } from "./nextGoal";

function formatAchievementLine(titles: string[]): string {
  if (titles.length === 1) {
    return `Открыто достижение: ${titles[0]}.`;
  }
  if (titles.length === 2) {
    return `Новые достижения: ${titles[0]} и ${titles[1]}.`;
  }
  return `Новые достижения: ${titles.slice(0, 2).join(", ")} и ещё ${titles.length - 2}.`;
}

export function buildSessionProgressNotes(
  result: SessionSaveResult | null | undefined
): string[] {
  if (!result) {
    return [];
  }

  const notes: string[] = [];
  const breakdown = result.xpBreakdown;

  if (breakdown && breakdown.total > 0) {
    const parts: string[] = [];

    if (breakdown.session > 0) {
      parts.push(`${breakdown.session} XP за сессию`);
    }
    if (breakdown.dailyComplete > 0) {
      parts.push(`${breakdown.dailyComplete} XP за цель дня`);
    }
    if (breakdown.streakBonus > 0) {
      parts.push(`${breakdown.streakBonus} XP за серию`);
    }
    if (breakdown.achievement > 0) {
      parts.push(`${breakdown.achievement} XP за достижения`);
    }

    if (parts.length > 0) {
      notes.push(`Прогресс: +${breakdown.total} XP (${parts.join(", ")}).`);
    }
  }

  if (result.levelUp) {
    notes.push(`Новый уровень: ${result.levelUp.fromLevel} -> ${result.levelUp.toLevel}.`);
  }

  if (result.unlockedAchievements && result.unlockedAchievements.length > 0) {
    notes.push(formatAchievementLine(result.unlockedAchievements.map((item) => item.title)));
  }

  if (result.dailyTrainingCompleted) {
    notes.push("Дневная цель закрыта. Ритм на сегодня засчитан.");
  }

  if (result.nextGoal) {
    notes.push(formatProgressGoalLine(result.nextGoal));
  }

  return notes;
}
