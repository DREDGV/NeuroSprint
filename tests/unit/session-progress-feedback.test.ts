import { describe, expect, it } from "vitest";
import { buildSessionProgressNotes } from "../../src/shared/lib/progress/sessionProgressFeedback";

describe("buildSessionProgressNotes", () => {
  it("formats xp breakdown, level up, unlocked achievements and the next goal", () => {
    const notes = buildSessionProgressNotes({
      xpGranted: 72,
      leveledUp: true,
      levelUp: {
        fromLevel: 3,
        toLevel: 4
      },
      dailyTrainingCompleted: true,
      xpBreakdown: {
        session: 12,
        dailyComplete: 25,
        streakBonus: 5,
        achievement: 30,
        total: 72
      },
      unlockedAchievements: [
        {
          id: "skill_memory_match_10",
          title: "Карта памяти",
          icon: "🧩",
          category: "skill"
        }
      ],
      newlyUnlockedAchievements: ["skill_memory_match_10"],
      nextGoal: {
        levelGoal: {
          kind: "level",
          id: "level:5",
          icon: "★",
          title: "Уровень 5",
          progressPct: 84,
          currentValue: 84,
          targetValue: 100,
          remaining: 16,
          progressLabel: "84/100 XP",
          summary: "До уровня 5 осталось 16 XP",
          remainingLabel: "16 XP"
        },
        achievementGoal: null,
        primaryGoal: {
          kind: "level",
          id: "level:5",
          icon: "★",
          title: "Уровень 5",
          progressPct: 84,
          currentValue: 84,
          targetValue: 100,
          remaining: 16,
          progressLabel: "84/100 XP",
          summary: "До уровня 5 осталось 16 XP",
          remainingLabel: "16 XP"
        },
        secondaryGoal: null
      }
    });

    expect(notes).toEqual([
      "Прогресс: +72 XP (12 XP за сессию, 25 XP за цель дня, 5 XP за серию, 30 XP за достижения).",
      "Новый уровень: 3 -> 4.",
      "Открыто достижение: Карта памяти.",
      "Дневная цель закрыта. Ритм на сегодня засчитан.",
      "Следующая цель: До уровня 5 осталось 16 XP."
    ]);
  });

  it("returns an empty array when there is no progress payload", () => {
    expect(buildSessionProgressNotes(null)).toEqual([]);
    expect(buildSessionProgressNotes(undefined)).toEqual([]);
  });
});
