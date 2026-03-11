import { describe, expect, it } from "vitest";
import {
  calculateSkillPercentile,
  getRankDescription,
  getRankColor,
  getSkillLevel,
  getSkillSummary,
  getSkillMapSummary
} from "../../src/shared/lib/progress/skillPercentileService";
import type { SkillProfileId, SkillRank } from "../../src/shared/types/domain";

describe("skillPercentileService", () => {
  describe("getSkillLevel", () => {
    it("returns 'weak' for scores below 40", () => {
      expect(getSkillLevel(0)).toBe("weak");
      expect(getSkillLevel(25)).toBe("weak");
      expect(getSkillLevel(39)).toBe("weak");
    });

    it("returns 'medium' for scores between 40 and 69", () => {
      expect(getSkillLevel(40)).toBe("medium");
      expect(getSkillLevel(50)).toBe("medium");
      expect(getSkillLevel(69)).toBe("medium");
    });

    it("returns 'strong' for scores 70 and above", () => {
      expect(getSkillLevel(70)).toBe("strong");
      expect(getSkillLevel(85)).toBe("strong");
      expect(getSkillLevel(100)).toBe("strong");
    });
  });

  describe("getRankDescription", () => {
    it("returns correct description for each rank", () => {
      expect(getRankDescription("top_1%")).toContain("топ-1%");
      expect(getRankDescription("top_5%")).toContain("топ-5%");
      expect(getRankDescription("top_10%")).toContain("топ-10%");
      expect(getRankDescription("top_25%")).toContain("75%");
      expect(getRankDescription("top_50%")).toContain("выше среднего");
      expect(getRankDescription("bottom_50%")).toContain("Есть куда расти");
    });
  });

  describe("getRankColor", () => {
    it("returns correct color for each rank", () => {
      expect(getRankColor("top_1%")).toBe("#FFD700"); // Gold
      expect(getRankColor("top_5%")).toBe("#9932CC"); // Purple
      expect(getRankColor("top_10%")).toBe("#4169E1"); // Blue
      expect(getRankColor("top_25%")).toBe("#32CD32"); // Green
      expect(getRankColor("top_50%")).toBe("#FFA500"); // Orange
      expect(getRankColor("bottom_50%")).toBe("#808080"); // Gray
    });
  });

  describe("calculateSkillPercentile", () => {
    it("calculates percentile for attention skill", async () => {
      const result = await calculateSkillPercentile("attention", 50);
      expect(result.skillId).toBe("attention");
      expect(result.userScore).toBe(50);
      expect(result.percentile).toBeGreaterThan(0);
      expect(result.percentile).toBeLessThanOrEqual(100);
    });

    it("calculates higher percentile for higher scores", async () => {
      const low = await calculateSkillPercentile("memory", 30);
      const high = await calculateSkillPercentile("memory", 80);
      expect(high.percentile).toBeGreaterThan(low.percentile);
    });

    it("calculates percentiles for all skills", async () => {
      const skills: SkillProfileId[] = ["attention", "memory", "reaction", "math", "logic"];
      for (const skill of skills) {
        const result = await calculateSkillPercentile(skill, 50);
        expect(result.skillId).toBe(skill);
        expect(result.rank).toBeDefined();
      }
    });
  });

  describe("getSkillSummary", () => {
    it("returns complete skill summary", async () => {
      const summary = await getSkillSummary("attention", 65, 2);
      expect(summary.skillId).toBe("attention");
      expect(summary.score).toBe(65);
      expect(summary.level).toBe("medium");
      expect(summary.percentile).toBeGreaterThan(0);
      expect(summary.improvements).toBe(2);
    });

    it("classifies weak skills correctly", async () => {
      const summary = await getSkillSummary("logic", 35, 0);
      expect(summary.level).toBe("weak");
    });

    it("classifies strong skills correctly", async () => {
      const summary = await getSkillSummary("reaction", 85, 5);
      expect(summary.level).toBe("strong");
    });
  });

  describe("getSkillMapSummary", () => {
    it("returns complete skill map summary", async () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 60,
        memory: 45,
        reaction: 75,
        math: 50,
        logic: 40
      };

      const summary = await getSkillMapSummary("user123", skillScores);

      expect(summary.userId).toBe("user123");
      expect(summary.skills.length).toBe(5);
      expect(summary.avgPercentile).toBeGreaterThan(0);
      expect(summary.bestSkill).toBeDefined();
      expect(summary.weakestSkill).toBeDefined();
      expect(summary.lastUpdated).toBeDefined();
    });

    it("identifies correct best and weakest skills", async () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 90, // highest
        memory: 30,    // lowest
        reaction: 50,
        math: 60,
        logic: 45
      };

      const summary = await getSkillMapSummary("user456", skillScores);

      expect(summary.bestSkill?.skillId).toBe("attention");
      expect(summary.weakestSkill?.skillId).toBe("memory");
    });

    it("calculates top rank count correctly", async () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 85, // top 25%
        memory: 80,    // top 25%
        reaction: 30,  // bottom
        math: 50,      // medium
        logic: 40      // medium
      };

      const summary = await getSkillMapSummary("user789", skillScores);

      expect(summary.topRankCount).toBeGreaterThanOrEqual(2);
    });
  });
});