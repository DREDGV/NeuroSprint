import { describe, expect, it } from "vitest";
import {
  SKILL_ACHIEVEMENT_CATALOG,
  getSkillAchievementById,
  getSkillAchievementsBySkillId,
  getSkillAchievementsByThreshold,
  getSkillAchievementRewardXP,
  getVisibleSkillAchievements
} from "../../src/shared/lib/progress/skillAchievementList";
import type { SkillProfileId } from "../../src/shared/types/domain";

describe("skillAchievementList", () => {
  describe("SKILL_ACHIEVEMENT_CATALOG", () => {
    it("contains exactly 10 achievements", () => {
      expect(SKILL_ACHIEVEMENT_CATALOG.length).toBe(10);
    });

    it("has achievements for all 5 skills", () => {
      const skills: SkillProfileId[] = ["attention", "memory", "reaction", "math", "logic"];
      const foundSkills = new Set<SkillProfileId>();

      SKILL_ACHIEVEMENT_CATALOG.forEach((achievement) => {
        foundSkills.add(achievement.skillId);
      });

      skills.forEach((skill) => {
        expect(foundSkills).toContain(skill);
      });
    });

    it("has 2 achievements per skill (50 and 80 thresholds)", () => {
      const skills: SkillProfileId[] = ["attention", "memory", "reaction", "math", "logic"];

      skills.forEach((skill) => {
        const skillAchievements = SKILL_ACHIEVEMENT_CATALOG.filter((achievement) => achievement.skillId === skill);
        expect(skillAchievements.length).toBe(2);

        const thresholds = skillAchievements.map((achievement) => achievement.threshold);
        expect(thresholds).toContain(50);
        expect(thresholds).toContain(80);
      });
    });

    it("all achievements have category 'skill_mastery'", () => {
      SKILL_ACHIEVEMENT_CATALOG.forEach((achievement) => {
        expect(achievement.category).toBe("skill_mastery");
      });
    });

    it("all achievements are visible (not hidden)", () => {
      SKILL_ACHIEVEMENT_CATALOG.forEach((achievement) => {
        expect(achievement.hidden).toBe(false);
      });
    });

    it("achievements have unique IDs", () => {
      const ids = SKILL_ACHIEVEMENT_CATALOG.map((achievement) => achievement.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("getSkillAchievementById", () => {
    it("returns achievement for valid ID", () => {
      const achievement = getSkillAchievementById("skill_attention_50");
      expect(achievement).toBeDefined();
      expect(achievement?.skillId).toBe("attention");
      expect(achievement?.threshold).toBe(50);
    });

    it("returns undefined for invalid ID", () => {
      const achievement = getSkillAchievementById("invalid_id");
      expect(achievement).toBeUndefined();
    });

    it("contains readable russian titles", () => {
      expect(getSkillAchievementById("skill_memory_50")?.title).toBe("Мастер памяти I");
      expect(getSkillAchievementById("skill_logic_80")?.description).toContain("логическому мышлению");
    });
  });

  describe("getSkillAchievementsBySkillId", () => {
    it("returns 2 achievements for attention", () => {
      const achievements = getSkillAchievementsBySkillId("attention");
      expect(achievements.length).toBe(2);
      expect(achievements[0].threshold).toBe(50);
      expect(achievements[1].threshold).toBe(80);
    });

    it("returns achievements sorted by order", () => {
      const achievements = getSkillAchievementsBySkillId("memory");
      expect(achievements[0].order).toBeLessThan(achievements[1].order);
    });

    it("returns correct achievements for all skills", () => {
      const skills: SkillProfileId[] = ["attention", "memory", "reaction", "math", "logic"];

      skills.forEach((skill) => {
        const achievements = getSkillAchievementsBySkillId(skill);
        expect(achievements.length).toBe(2);
        expect(achievements.every((achievement) => achievement.skillId === skill)).toBe(true);
      });
    });
  });

  describe("getSkillAchievementsByThreshold", () => {
    it("returns 5 achievements for threshold 50", () => {
      const achievements = getSkillAchievementsByThreshold(50);
      expect(achievements.length).toBe(5);
      achievements.forEach((achievement) => {
        expect(achievement.threshold).toBe(50);
      });
    });

    it("returns 5 achievements for threshold 80", () => {
      const achievements = getSkillAchievementsByThreshold(80);
      expect(achievements.length).toBe(5);
      achievements.forEach((achievement) => {
        expect(achievement.threshold).toBe(80);
      });
    });
  });

  describe("getSkillAchievementRewardXP", () => {
    it("returns 35 XP for 50 threshold achievements", () => {
      const achievement = getSkillAchievementById("skill_logic_50");
      expect(getSkillAchievementRewardXP(achievement!)).toBe(35);
    });

    it("returns 50 XP for 80 threshold achievements", () => {
      const achievement = getSkillAchievementById("skill_reaction_80");
      expect(getSkillAchievementRewardXP(achievement!)).toBe(50);
    });
  });

  describe("getVisibleSkillAchievements", () => {
    it("returns all 10 achievements (all are visible)", () => {
      const visible = getVisibleSkillAchievements();
      expect(visible.length).toBe(10);
    });

    it("all returned achievements have hidden=false", () => {
      const visible = getVisibleSkillAchievements();
      visible.forEach((achievement) => {
        expect(achievement.hidden).toBe(false);
      });
    });
  });
});